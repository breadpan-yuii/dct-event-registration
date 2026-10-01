/**
 * models/Event.js
 * ------------------------------------------------------------------
 * Event domain model. Owns Event *shape*, *validation* and
 * *business rules* (capacity, registration window) plus the data
 * access used by controllers.
 *
 * MVC: this is the MODEL — no request/response handling and no
 * HTML rendering happens in here.
 * ------------------------------------------------------------------
 */
const Db = require('./db');
const { PATHS } = require('../config/constants');

const COLLECTION = 'events';

const DEPARTMENT_LIST = [
  'Elementary Department',
  'Junior High School Department',
  'Senior High School Department',
  'College of Liberal Arts',
  'College of Education',
  'College of Hospitality and Tourism Management',
  'College of Computer Studies',
  'College of Business and Accountancy',
  'College of Criminal Justice Education',
];

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

class Event {
  constructor(regModel, db = null) {
    this.db = db || new Db(PATHS.dataDir);
    this.regModel = regModel; // injected Registration model (composition)
  }

  /** Shape/defaults for a new event. */
  static defaults() {
    return {
      code: '',
      title: '',
      slug: '',
      description: '',
      venue: '',
      date: '',             // YYYY-MM-DD
      timeStart: '',        // HH:mm
      timeEnd: '',          // HH:mm
      capacity: 0,
      registrationOpen: true,
      organizer: 'Office of Student Affairs and Services',
      contactEmail: 'osas@dct.edu.ph',
    };
  }

  /** Business validation. Returns { ok, errors } with field -> message. */
  static validate(input = {}) {
    const errors = {};
    const d = { ...Event.defaults(), ...input };

    if (!String(d.title || '').trim()) errors.title = 'Event title is required.';
    else if (String(d.title).trim().length < 5) errors.title = 'Title must be at least 5 characters.';

    if (!String(d.code || '').trim()) errors.code = 'Short code is required (e.g. FOUND2026).';
    else if (!/^[A-Z0-9-]{3,16}$/i.test(String(d.code).trim()))
      errors.code = 'Code must be 3–16 characters: letters, digits, dashes.';

    if (!String(d.description || '').trim()) errors.description = 'Description is required.';

    if (!String(d.venue || '').trim()) errors.venue = 'Venue is required.';

    if (!String(d.date || '').trim()) errors.date = 'Date is required.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.date).trim()))
      errors.date = 'Date must use the format YYYY-MM-DD.';

    if (!/^\d{2}:\d{2}$/.test(String(d.timeStart || '').trim()))
      errors.timeStart = 'Start time is required (HH:mm).';
    if (!/^\d{2}:\d{2}$/.test(String(d.timeEnd || '').trim()))
      errors.timeEnd = 'End time is required (HH:mm).';

    const capacity = Number(d.capacity);
    if (!Number.isInteger(capacity) || capacity < 1)
      errors.capacity = 'Capacity must be a whole number of at least 1.';

    if (typeof d.registrationOpen !== 'boolean') errors.registrationOpen = 'Invalid flag.';

    return { ok: Object.keys(errors).length === 0, errors };
  }

  /* ------------------------------------------------------------------ *
   * Queries
   * ------------------------------------------------------------------ */

  async list() {
    return this.db.all(COLLECTION);
  }

  async findById(id) {
    return this.db.findById(COLLECTION, id);
  }

  async findBySlug(slug) {
    return this.db.findOne(COLLECTION, (e) => e.slug === slug);
  }

  async upcoming(now = new Date()) {
    const events = await this.list();
    return events
      .filter((e) => !this.isPast(e, now))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async past(now = new Date()) {
    const events = await this.list();
    return events
      .filter((e) => this.isPast(e, now))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  /* ------------------------------------------------------------------ *
   * Business rules helpers
   * ------------------------------------------------------------------ */

  isPast(event, now = new Date()) {
    if (!event.date) return false;
    const end = new Date(`${event.date}T${event.timeEnd || '23:59'}:00`);
    return end < now;
  }

  /** Is the event accepting registrations right now (window + flag + seats)? */
  async isOpen(event, now = new Date()) {
    if (!event.registrationOpen) return false;
    if (this.isPast(event, now)) return false;
    const seats = await this.seatsAvailable(event);
    return seats > 0;
  }

  async seatsAvailable(event) {
    const { registrations } = await this.regModel.countsByEvent(event.id);
    const capacity = Number(event.capacity) || 0;
    return Math.max(0, capacity - registrations);
  }

  /** Fill ratio 0..100 — how full seating is. */
  async fillPercent(event) {
    const { registrations } = await this.regModel.countsByEvent(event.id);
    const capacity = Number(event.capacity) || 0;
    if (capacity <= 0) return 0;
    return Math.min(100, Math.round((registrations / capacity) * 100));
  }

  /** Registration count (active = not cancelled). */
  async activeRegistrationCount(eventId) {
    const { registrations } = await this.regModel.countsByEvent(eventId);
    return registrations;
  }

  /* ------------------------------------------------------------------ *
   * Mutations
   * ------------------------------------------------------------------ */

  async create(input) {
    const data = { ...Event.defaults(), ...input };
    const check = Event.validate(data);
    if (!check.ok) return { ok: false, errors: check.errors };

    const existing = await this.db.findOne(COLLECTION, (e) => e.code === data.code);
    if (existing) return { ok: false, errors: { code: 'An event with that code already exists.' } };

    const slugBase = data.slug || slugify(data.title);
    const record = await this.db.insert(COLLECTION, {
      ...data,
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      slug: await this.uniqueSlug(slugBase),
      venue: data.venue.trim(),
      description: data.description.trim(),
      capacity: Number(data.capacity),
    });
    return { ok: true, event: record };
  }

  async update(id, input) {
    const current = await this.findById(id);
    if (!current) return { ok: false, errors: { id: 'Event not found.' } };

    const data = { ...current, ...input, id: undefined, createdAt: undefined };
    const check = Event.validate(data);
    if (!check.ok) return { ok: false, errors: check.errors };

    const clash = await this.db.findOne(
      COLLECTION,
      (e) => e.code === data.code && String(e.id) !== String(id)
    );
    if (clash) return { ok: false, errors: { code: 'An event with that code already exists.' } };

    const slugBase = data.slug || slugify(data.title);
    const record = await this.db.update(COLLECTION, id, {
      ...data,
      code: data.code.trim().toUpperCase(),
      title: data.title.trim(),
      slug: slugBase === current.slug ? slugBase : await this.uniqueSlug(slugBase, id),
      venue: data.venue.trim(),
      description: data.description.trim(),
      capacity: Number(data.capacity),
    });
    return { ok: true, event: record };
  }

  /** Soft-safety: refuse to delete an event that already has registrations. */
  async remove(id) {
    const event = await this.findById(id);
    if (!event) return { ok: false, error: 'Event not found.' };
    const count = await this.activeRegistrationCount(id);
    if (count > 0) {
      return {
        ok: false,
        error: `This event already has ${count} registration(s). Delete or cancel them first.`,
      };
    }
    await this.db.remove(COLLECTION, id);
    return { ok: true };
  }

  /** Ensure a URL-friendly, unique slug. */
  async uniqueSlug(base, exceptId = null) {
    const slug = base || 'event';
    let candidate = slug;
    let i = 2;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const hit = await this.db.findOne(
        COLLECTION,
        (e) => e.slug === candidate && String(e.id) !== String(exceptId)
      );
      if (!hit) return candidate;
      candidate = `${slug}-${i++}`;
    }
  }

  static departmentList() {
    return DEPARTMENT_LIST;
  }
}

module.exports = Event;