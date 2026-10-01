/**
 * controllers/adminController.js
 * MVC: CONTROLLER — admin area: dashboard, event CRUD, registrations
 * management and CSV export.
 */
const { createModels } = require('../models');
const { APP } = require('../config/constants');

const { eventModel, regModel } = createModels();

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

exports.loginForm = (req, res) => {
  res.render('layout', { title: 'Admin Login', body: 'admin/login', activeNav: 'admin' });
};

exports.login = (req, res) => {
  const { passcode = '' } = req.body;
  if (passcode === APP.adminPasscode) {
    res.cookie('dct_admin', APP.adminPasscode, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 8, // 8h
    });
    return res.redirect('/admin?msg=' + encodeURIComponent('Welcome back, DCT Administrator!') + '&type=success');
  }
  res.status(401).render('layout', {
    title: 'Admin Login',
    body: 'admin/login',
    activeNav: 'admin',
    error: 'Incorrect administration passcode.',
  });
};

exports.logout = (req, res) => {
  res.clearCookie('dct_admin');
  res.redirect('/admin/login');
};

/* ------------------------------------------------------------------ *
 * Dashboard
 * ------------------------------------------------------------------ */

exports.dashboard = async function dashboard(req, res, next) {
  try {
    const [events, stats] = await Promise.all([eventModel.list(), regModel.globalStats()]);

    const rows = await Promise.all(
      events.map(async (e) => {
        const counts = await regModel.countsByEvent(e.id);
        return {
          ...e,
          ...counts,
          fill: await eventModel.fillPercent(e),
          open: await eventModel.isOpen(e),
          past: await eventModel.isPast(e),
        };
      })
    );

    const recent = (await regModel.list())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 8);

    res.render('layout', {
      title: 'Admin Dashboard',
      body: 'admin/dashboard',
      activeNav: 'admin',
      totals: {
        events: events.length,
        upcoming: events.filter((e) => !eventModel.isPast(e)).length,
        registrations: stats.confirmed,
        cancelled: stats.cancelled,
      },
      rows,
      recent,
    });
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ *
 * Event CRUD
 * ------------------------------------------------------------------ */

exports.eventsIndex = async function eventsIndex(req, res, next) {
  try {
    const events = await eventModel.list();
    const rows = await Promise.all(
      events.map(async (e) => {
        const counts = await regModel.countsByEvent(e.id);
        return {
          ...e,
          ...counts,
          open: await eventModel.isOpen(e),
          past: await eventModel.isPast(e),
        };
      })
    );
    rows.sort((a, b) => b.date.localeCompare(a.date));

    res.render('layout', {
      title: 'Manage Events',
      body: 'admin/events',
      activeNav: 'admin',
      rows,
    });
  } catch (err) {
    next(err);
  }
};

exports.eventNew = (req, res) => {
  res.render('layout', {
    title: 'New Event',
    body: 'admin/event-form',
    activeNav: 'admin',
    action: '/admin/events',
    method: 'POST',
    submitLabel: 'Create Event',
    form: {},
    errors: {},
  });
};

exports.eventCreate = async function eventCreate(req, res, next) {
  try {
    const result = await eventModel.create(req.body);
    if (!result.ok) {
      return res.status(400).render('layout', {
        title: 'New Event',
        body: 'admin/event-form',
        activeNav: 'admin',
        action: '/admin/events',
        method: 'POST',
        submitLabel: 'Create Event',
        form: req.body,
        errors: result.errors,
      });
    }
    res.redirect(
      `/admin/events?msg=${encodeURIComponent(`Event "${result.event.title}" created.`)}&type=success`
    );
  } catch (err) {
    next(err);
  }
};

exports.eventEdit = async function eventEdit(req, res, next) {
  try {
    const event = await eventModel.findById(req.params.id);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
    res.render('layout', {
      title: `Edit — ${event.title}`,
      body: 'admin/event-form',
      activeNav: 'admin',
      action: `/admin/events/${event.id}`,
      method: 'POST',
      submitLabel: 'Save Changes',
      form: event,
      errors: {},
    });
  } catch (err) {
    next(err);
  }
};

exports.eventUpdate = async function eventUpdate(req, res, next) {
  try {
    const event = await eventModel.findById(req.params.id);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const result = await eventModel.update(event.id, { ...req.body, id: event.id });
    if (!result.ok) {
      return res.status(400).render('layout', {
        title: `Edit — ${event.title}`,
        body: 'admin/event-form',
        activeNav: 'admin',
        action: `/admin/events/${event.id}`,
        method: 'POST',
        submitLabel: 'Save Changes',
        form: { ...event, ...req.body },
        errors: result.errors,
      });
    }
    res.redirect(
      `/admin/events?msg=${encodeURIComponent(`Event "${result.event.title}" updated.`)}&type=success`
    );
  } catch (err) {
    next(err);
  }
};

exports.eventDelete = async function eventDelete(req, res, next) {
  try {
    const event = await eventModel.findById(req.params.id);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
    const result = await eventModel.remove(event.id);
    res.redirect(
      `/admin/events?msg=${encodeURIComponent(result.ok ? `Event "${event.title}" deleted.` : result.error)}&type=${result.ok ? 'success' : 'error'}`
    );
  } catch (err) {
    next(err);
  }
};

/* ------------------------------------------------------------------ *
 * Registrations management
 * ------------------------------------------------------------------ */

exports.eventRegistrations = async function eventRegistrations(req, res, next) {
  try {
    const event = await eventModel.findById(req.params.id);
    if (!event) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });

    const rows = await regModel.listByEvent(event.id);

    // CSV export
    if (req.query.export === 'csv') {
      const cols = ['reference', 'fullName', 'email', 'phone', 'studentId', 'department', 'yearLevel', 'status', 'notes', 'createdAt'];
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
      const csv = [cols.map(escape).join(',')]
        .concat(rows.map((r) => cols.map((c) => escape(r[c])).join(',')))
        .join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="dct-${event.code}-registrations.csv"`);
      return res.send('\uFEFF' + csv); // BOM so Excel reads UTF-8
    }

    res.render('layout', {
      title: `Registrations — ${event.title}`,
      body: 'admin/event-registrations',
      activeNav: 'admin',
      event,
      rows,
      confirmed: rows.filter((r) => r.status === 'confirmed').length,
    });
  } catch (err) {
    next(err);
  }
};

exports.registrationCancel = async function registrationCancel(req, res, next) {
  try {
    const reg = await regModel.findById(req.params.id);
    if (!reg) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
    const result = await regModel.cancel(reg.id);
    res.redirect(
      `/admin/events/${reg.eventId}/registrations?msg=${encodeURIComponent(result.ok ? `Registration ${reg.reference} cancelled.` : result.error)}&type=${result.ok ? 'success' : 'error'}`
    );
  } catch (err) {
    next(err);
  }
};

exports.registrationDelete = async function registrationDelete(req, res, next) {
  try {
    const reg = await regModel.findById(req.params.id);
    if (!reg) return res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
    const result = await regModel.remove(reg.id);
    res.redirect(
      `/admin/events/${reg.eventId}/registrations?msg=${encodeURIComponent(result.ok ? `Registration ${reg.reference} deleted.` : result.error)}&type=${result.ok ? 'success' : 'error'}`
    );
  } catch (err) {
    next(err);
  }
};