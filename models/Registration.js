/**
 * models/Registration.js
 * ------------------------------------------------------------------
 * Registration domain model. Owns the registration *shape*,
 * *validation*, unique reference-code generation and the business
 * rule "one active registration per person — per event".
 *
 * MVC: this is the MODEL — pure data + business logic, no HTTP / UI.
 * ------------------------------------------------------------------
 */
const Db = require('./db');
const { PATHS } = require('../config/constants');

const COLLECTION = 'registrations';

const YEAR_LEVELS = [
  'Grade School',
  'Junior High School',
  'Senior High School',
  '1st Year College',
  '2nd Year College',
  '3rd Year College',
  '4th Year College',
  'Faculty / Staff',
  'Alumni',
  'Guest',
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^(\+?63|0)\d{9,10}$/;

class Registration {
  constructor(eventModel, db = null) {
    this.db = db || new Db(PATHS.dataDir);
    this.eventModel = eventModel; // injected Event model (composition)
  }

  static defaults() {
    return {
      eventId: null,
      eventCode: '',
      fullName: '',
      email: '',
      phone: '',
      studentId: '',
      department: '',
      yearLevel: '',
      notes: '',
      status: 'confirmed', // confirmed | cancelled
      reference: '',
    };
  }

  /** Field-level validation. Returns { ok, errors }. */
  static validate(input = {}) {
    const errors = {};
    const d = { ...Registration.defaults(), ...input };

    const fullName = String(d.fullName || '').trim();
    if (!fullName) errors.fullName = 'Full name is required.';
    else if (fullName.split(/\s+/).length < 2) errors.fullName = 'Please provide first and last name.';
    else if (!/^[A-Za-zÑñ'.\- ]+$/.test(fullName)) errors.fullName = 'Name contains invalid characters.';

    const email = String(d.email || '').trim();
    if (!email) errors.email = 'Email address is required.';
    else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';

    const phone = String(d.phone || '').trim().replace(/[\s-]/g, '');
    if (!phone) errors.phone = 'Mobile number is required.';
    else if (!PHONE_RE.test(phone)) errors.phone = 'Enter a valid PH mobile number (e.g. 09171234567).';

    const department = String(d.department || '').trim();
    if (!department) errors.department = 'Department is required.';

    const yearLevel = String(d.yearLevel || '').trim();
    if (!yearLevel) errors.yearLevel = 'Year level / status is required.';

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

  async findByReference(ref) {
    return this.db.findOne(COLLECTION, (r) => r.reference === ref);
  }

  /** Lookup used on the public "My Registration" page. */
  async searchByOwner(email, reference, eventId = null) {
    const rows = await this.list();
    return rows.filter((r) => {
      if (r.status !== 'confirmed') return false;
      if (email && r.email.toLowerCase() !== email.toLowerCase()) return false;
      if (reference && r.reference.toLowerCase() !== reference.toLowerCase()) return false;
      if (eventId && String(r.eventId) !== String(eventId)) return false;
      return true;
    });
  }

  async listByEvent(eventId) {
    const rows = await this.list();
    return rows
      .filter((r) => String(r.eventId) === String(eventId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Active (confirmed) registration counts keyed by event id. */
  async countsByEvent(eventId) {
    const rows = await this.list();
    const forEvent = rows.filter((r) => String(r.eventId) === String(eventId));
    return {
      total: forEvent.length,
      registrations: forEvent.filter((r) => r.status === 'confirmed').length,
      cancelled: forEvent.filter((r) => r.status === 'cancelled').length,
    };
  }

  /** Dashboard-style stats across everything. */
  async globalStats() {
    const rows = await this.list();
    const confirmed = rows.filter((r) => r.status === 'confirmed');
    const byEvent = {};
    for (const r of confirmed) {
      const key = String(r.eventId);
      byEvent[key] = (byEvent[key] || 0) + 1;
    }
    return {
      total: rows.length,
      confirmed: confirmed.length,
      cancelled: rows.length - confirmed.length,
      byEvent,
    };
  }

  /* ------------------------------------------------------------------ *
   * Mutations
   * ------------------------------------------------------------------ */

  /**
   * Create a registration. Atomic business rule:
   *  - event must exist,
   *  - event must be open (window + flag + capacity),
   *  - no duplicate active registration for the same email on the same event,
   *  - then assign a unique public reference code and persist.
   */
  async create(input) {
    const data = { ...Registration.defaults(), ...input };
    data.eventId = input.eventId != null ? String(input.eventId) : null;

    const event = data.eventId != null ? await this.eventModel.findById(data.eventId) : null;
    if (!event) return { ok: false, errors: { eventId: 'The selected event no longer exists.' } };

    const check = Registration.validate(data);
    if (!check.ok) return { ok: false, errors: check.errors };

    if (!(await this.eventModel.isOpen(event))) {
      return {
        ok: false,
        errors: { eventId: 'Registrations for this event are closed (past date, disabled, or full).' },
      };
    }

    const dup = await this.db.findOne(
      COLLECTION,
      (r) =>
        String(r.eventId) === String(event.id) &&
        r.email.toLowerCase() === String(data.email).trim().toLowerCase() &&
        r.status === 'confirmed'
    );
    if (dup) {
      return {
        ok: false,
        errors: { email: 'You already have an active registration for this event.' },
      };
    }

    const reference = await this.nextReference(event.code);

    const record = await this.db.insert(COLLECTION, {
      ...data,
      eventCode: event.code,
      eventTitle: event.title,
      fullName: String(data.fullName).trim(),
      email: String(data.email).trim().toLowerCase(),
      phone: String(data.phone).trim().replace(/[\s-]/g, ''),
      studentId: String(data.studentId || '').trim(),
      department: String(data.department).trim(),
      yearLevel: String(data.yearLevel).trim(),
      notes: String(data.notes || '').trim(),
      status: 'confirmed',
      reference,
    });

    return { ok: true, registration: record, event };
  }

  /** Cancel (soft delete) an active registration. */
  async cancel(id) {
    const current = await this.findById(id);
    if (!current) return { ok: false, error: 'Registration not found.' };
    if (current.status === 'cancelled') {
      return { ok: false, error: 'This registration is already cancelled.' };
    }
    const record = await this.db.update(COLLECTION, id, { status: 'cancelled' });
    return { ok: true, registration: record };
  }

  /** Hard delete (admin only). */
  async remove(id) {
    const current = await this.findById(id);
    if (!current) return { ok: false, error: 'Registration not found.' };
    await this.db.remove(COLLECTION, id);
    return { ok: true };
  }

  /* ------------------------------------------------------------------ *
   * Helpers
   * ------------------------------------------------------------------ */

  /** Build a short, readable, unique reference: DCT-<EVENTCODE>-<NNNN>. */
  async nextReference(eventCode) {
    const base = `DCT-${String(eventCode).replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'EVT'}`;
    // deterministic: count existing refs with this prefix + 1
    const rows = await this.list();
    const used = new Set(rows.map((r) => r.reference));
    let n = rows.filter((r) => r.reference && r.reference.startsWith(base)).length + 1;
    let ref = `${base}-${String(n).padStart(4, '0')}`;
    while (used.has(ref)) {
      n += 1;
      ref = `${base}-${String(n).padStart(4, '0')}`;
    }
    return ref;
  }

  static yearLevels() {
    return YEAR_LEVELS;
  }
}

module.exports = Registration;