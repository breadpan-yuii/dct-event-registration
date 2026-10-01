/**
 * server.js — application bootstrap.
 * ------------------------------------------------------------------
 * MVC wiring:
 *   Model       -> models/      (data + business rules, JSON store)
 *   View        -> views/       (EJS templates, served through layout)
 *   Controller  -> controllers/ (HTTP choreography)
 *   Routes      -> routes/      (URL -> controller mapping)
 * ------------------------------------------------------------------
 * Run:   npm start        (http://localhost:3000)
 *        npm run seed     (load sample data)
 */
const express = require('express');
const path = require('path');
const ejs = require('ejs');

const { APP, SCHOOL, THEME } = require('./config/constants');
const flash = require('./middleware/flash');

const indexRoutes = require('./routes/index');
const eventRoutes = require('./routes/events');
const registrationRoutes = require('./routes/registrations');
const adminRoutes = require('./routes/admin');

/* ------------------------------------------------------------------ *
 * App + view engine
 * ------------------------------------------------------------------ */
const app = express();

// Custom engine. EJS's Express special-casing rebuilds `opts.views` from
// `data.settings.views` (a plain string), dropping anything set on the merged
// options — which breaks nested relative includes inside subdirectory
// templates (e.g. `views/events/list.ejs` including `partials/event-card`).
// We therefore feed it an *array* of views roots (per-render copy so the
// shared `app.settings` object is untouched) plus a `view options.root`, so
// root-relative includes like `<%- include('/partials/head') %>` also resolve
// from any depth.
const VIEWS_DIR = path.join(__dirname, 'views');
app.engine('ejs', (filePath, options, callback) => {
  options.settings = Object.assign({}, options.settings, {
    views: [VIEWS_DIR],
    'view options': { root: [VIEWS_DIR] },
  });
  ejs.renderFile(filePath, options, callback);
});
app.set('view engine', 'ejs');
app.set('views', VIEWS_DIR);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/assets', express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* ------------------------------------------------------------------ *
 * Locals + formatting helpers shared by every view (View-layer utils)
 * ------------------------------------------------------------------ */
app.locals.app = APP;
app.locals.school = SCHOOL;
app.locals.theme = THEME;

app.locals.fmtLongDate = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

app.locals.fmtMonthDay = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(iso);
  return new Date(y, m - 1, d)
    .toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
    .toUpperCase()
    .replace(',', '');
};

app.locals.fmtTime = (hhmm) => {
  if (!hhmm) return '';
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h)) return String(hhmm);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m ?? 0).padStart(2, '0')} ${period}`;
};

app.locals.fmtDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
};

/* ------------------------------------------------------------------ *
 * Middleware + routes
 * ------------------------------------------------------------------ */
app.use(flash);

app.use('/', indexRoutes);
app.use('/events', eventRoutes);
app.use('/registrations', registrationRoutes);
app.use('/admin', adminRoutes);

/* ------------------------------------------------------------------ *
 * 404 + error handling
 * ------------------------------------------------------------------ */
app.use((req, res) => {
  res.status(404).render('layout', { title: 'Not Found', body: 'errors/404' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).render('layout', { title: 'Server Error', body: 'errors/500' });
});

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */
const server = app.listen(APP.port, () => {
  console.log('');
  console.log(`  ${SCHOOL.name}`);
  console.log(`  ${APP.name} — MVC (Node.js + Express + EJS)`);
  console.log('');
  console.log(`  ➜ App:   http://localhost:${APP.port}`);
  console.log(`  ➜ Admin: http://localhost:${APP.port}/admin  (passcode: ${APP.adminPasscode})`);
  console.log('');
});

process.on('SIGINT', () => server.close(() => process.exit(0)));
process.on('SIGTERM', () => server.close(() => process.exit(0)));

module.exports = app; // handy for tests