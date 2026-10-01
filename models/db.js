/**
 * models/db.js
 * ------------------------------------------------------------------
 * Data layer. A tiny, dependency-free JSON file "database" that
 * persists collections (events.json, registrations.json) to disk.
 *
 * Every mutation is written atomically (write-temp-then-rename),
 * so a crash mid-write never corrupts the data files.
 * ------------------------------------------------------------------
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class Db {
  /**
   * @param {string} dataDir absolute path to the folder holding *.json collections
   */
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.cache = new Map(); // collectionName -> array of records
    this.loaded = false;
  }

  fileFor(collection) {
    return path.join(this.dataDir, `${collection}.json`);
  }

  /** Load every collection file in the data dir into memory. */
  async init() {
    if (this.loaded) return this;
    await fsp.mkdir(this.dataDir, { recursive: true });
    const files = await fsp.readdir(this.dataDir).catch(() => []);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const collection = path.basename(file, '.json');
      const raw = await fsp.readFile(this.fileFor(collection), 'utf8');
      try {
        this.cache.set(collection, JSON.parse(raw) || []);
      } catch {
        this.cache.set(collection, []);
      }
    }
    this.loaded = true;
    return this;
  }

  async rows(collection) {
    await this.init();
    if (!this.cache.has(collection)) this.cache.set(collection, []);
    return this.cache.get(collection);
  }

  async persist(collection) {
    const rows = this.cache.get(collection) || [];
    const file = this.fileFor(collection);
    const tmp = `${file}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    await fsp.mkdir(this.dataDir, { recursive: true });
    await fsp.writeFile(tmp, JSON.stringify(rows, null, 2), 'utf8');
    await fsp.rename(tmp, file);
    return rows;
  }

  async all(collection) {
    const rows = await this.rows(collection);
    return rows.slice(); // return a copy — callers must not mutate storage directly
  }

  async find(collection, predicate) {
    const rows = await this.rows(collection);
    return rows.filter(predicate).map((r) => ({ ...r }));
  }

  async findOne(collection, predicate) {
    const rows = await this.rows(collection);
    const hit = rows.find(predicate);
    return hit ? { ...hit } : null;
  }

  async findById(collection, id) {
    return this.findOne(collection, (r) => String(r.id) === String(id));
  }

  async insert(collection, record) {
    const rows = await this.rows(collection);
    const row = { ...record };
    if (row.id == null) {
      row.id = this.nextId(rows);
    }
    if (row.createdAt == null) row.createdAt = new Date().toISOString();
    row.updatedAt = new Date().toISOString();
    rows.push(row);
    await this.persist(collection);
    return { ...row };
  }

  async update(collection, id, patch) {
    const rows = await this.rows(collection);
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return null;
    const updated = {
      ...rows[idx],
      ...patch,
      id: rows[idx].id,
      createdAt: rows[idx].createdAt,
      updatedAt: new Date().toISOString(),
    };
    rows[idx] = updated;
    await this.persist(collection);
    return { ...updated };
  }

  async remove(collection, id) {
    const rows = await this.rows(collection);
    const idx = rows.findIndex((r) => String(r.id) === String(id));
    if (idx === -1) return false;
    rows.splice(idx, 1);
    await this.persist(collection);
    return true;
  }

  async removeWhere(collection, predicate) {
    const rows = await this.rows(collection);
    const kept = rows.filter((r) => !predicate(r));
    if (kept.length === rows.length) return 0;
    this.cache.set(collection, kept);
    await this.persist(collection);
    return rows.length - kept.length;
  }

  /** Highest numeric id + 1 (works for string ids too by coercion). */
  nextId(rows) {
    const max = rows.reduce((acc, r) => {
      const n = Number(r.id);
      return Number.isFinite(n) && n > acc ? n : acc;
    }, 0);
    return max + 1;
  }

  /** Replace the whole collection (used by the seed script). */
  async replace(collection, rows) {
    await this.init();
    this.cache.set(collection, rows);
    await this.persist(collection);
    return this.cache.get(collection).slice();
  }
}

module.exports = Db;
module.exports.fs = fs; // expose for the seed script if needed