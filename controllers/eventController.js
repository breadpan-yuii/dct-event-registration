/**
 * controllers/eventController.js
 * MVC: CONTROLLER for the public event pages + registration intake.
 */
const { createModels } = require('../models');

const { eventModel, regModel } = createModels();

async function decorate(event) {
  const [seatsLeft, fill, open, count, past] = await Promise.all([
    eventModel.seatsAvailable(event),
    eventModel.fillPercent(event),
    eventModel.isOpen(event),
    eventModel.activeRegistrationCount(event.id),
    eventModel.isPast(event),
  ]);
  return { ...event, seatsLeft, fill, open, registrations: count, past };
}

/** GET /events — all events (upcoming then past). */
exports.list = async function list(req, res, next) {
  try {
    const [upcoming, past] = await Promise.all([
      eventModel.upcoming(),
      eventModel.past(),
    ]);
    const upcomingReady = await Promise.all(upcoming.map(decorate));
    const pastReady = await Promise.all(past.map(decorate));

    res.render('layout', {
      title: 'Events',
      body: 'events/list',
      activeNav: 'events',
      upcoming: upcomingReady,
      past: pastReady,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /events/:slug — event detail page. */
exports.detail = async function detail(req, res, next) {
  try {
    const event = await eventModel.findBySlug(req.params.slug);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const ready = await decorate(event);
    res.render('layout', {
      title: event.title,
      body: 'events/detail',
      activeNav: 'events',
      event: ready,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /events/:slug/register — the registration form. */
exports.registerForm = async function registerForm(req, res, next) {
  try {
    const event = await eventModel.findBySlug(req.params.slug);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const ready = await decorate(event);
    res.render('layout', {
      title: `Register — ${event.title}`,
      body: 'events/register',
      activeNav: 'events',
      event: ready,
      departments: eventModel.constructor.departmentList(),
      yearLevels: regModel.constructor.yearLevels(),
      form: {},
      errors: {},
    });
  } catch (err) {
    next(err);
  }
};

/** POST /events/:slug/register — validate, save, redirect to receipt. */
exports.registerSubmit = async function registerSubmit(req, res, next) {
  try {
    const event = await eventModel.findBySlug(req.params.slug);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const payload = { eventId: String(event.id), ...req.body, eventId: undefined };
    payload.eventId = String(event.id);

    const result = await regModel.create(payload);

    if (!result.ok) {
      const ready = await decorate(event);
      return res.status(400).render('layout', {
        title: `Register — ${event.title}`,
        body: 'events/register',
        activeNav: 'events',
        event: ready,
        departments: eventModel.constructor.departmentList(),
        yearLevels: regModel.constructor.yearLevels(),
        form: payload,
        errors: result.errors,
      });
    }

    const flash = encodeURIComponent('Registration confirmed! Kindly take note of your reference number.');
    res.redirect(`/registrations/${result.registration.reference}?msg=${flash}&type=success`);
  } catch (err) {
    next(err);
  }
};