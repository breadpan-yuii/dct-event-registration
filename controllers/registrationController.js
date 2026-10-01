/**
 * controllers/registrationController.js
 * MVC: CONTROLLER — public registration receipt (by reference code)
 * and the "find my registration" lookup flow.
 */
const { createModels } = require('../models');

const { eventModel, regModel } = createModels();

/** Shared helper: enrich a registration with its event. */
async function withEvent(reg) {
  if (!reg) return null;
  const event = await eventModel.findById(reg.eventId);
  return { ...reg, event };
}

/** GET /registrations/:reference — public receipt / ticket. */
exports.confirm = async function confirm(req, res, next) {
  try {
    const reg = await regModel.findByReference(req.params.reference);
    if (!reg) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const data = await withEvent(reg);
    res.render('layout', {
      title: `Registration ${data.reference}`,
      body: 'registrations/confirm',
      activeNav: 'lookup',
      reg: data,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /registrations/lookup — search form. */
exports.lookupForm = async function lookupForm(req, res, next) {
  try {
    res.render('layout', {
      title: 'My Registration',
      body: 'registrations/lookup',
      activeNav: 'lookup',
      form: {},
      results: null,
      searched: false,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /registrations/lookup — find registrations by email (+ optional reference). */
exports.lookupSubmit = async function lookupSubmit(req, res, next) {
  try {
    const { email = '', reference = '' } = req.body;
    const form = { email: String(email).trim(), reference: String(reference).trim() };

    let errors = {};
    if (!form.email && !form.reference) {
      errors.general = 'Enter your email address and/or your reference number to look up your registration.';
    }

    let results = null;
    if (!errors.general) {
      const rows = await regModel.searchByOwner(form.email, form.reference);
      results = await Promise.all(rows.map(withEvent));
    }

    res.render('layout', {
      title: 'My Registration',
      body: 'registrations/lookup',
      activeNav: 'lookup',
      form,
      results,
      errors,
      searched: !errors.general,
    });
  } catch (err) {
    next(err);
  }
};

/** POST /registrations/:reference/cancel — cancel an active registration. */
exports.cancel = async function cancel(req, res, next) {
  try {
    const reg = await regModel.findByReference(req.params.reference);
    if (!reg) {
      return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
    }
    const result = await regModel.cancel(reg.id);
    const flash = result.ok
      ? 'Your registration has been cancelled. We hope to see you at another DCT event!'
      : result.error;
    res.redirect(`/registrations/${reg.reference}?msg=${encodeURIComponent(flash)}&type=${result.ok ? 'success' : 'error'}`);
  } catch (err) {
    next(err);
  }
};