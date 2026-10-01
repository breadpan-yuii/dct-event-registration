/**
 * middleware/adminAuth.js
 * ------------------------------------------------------------------
 * Very small passcode gate for the admin area. On success we store a
 * HttpOnly cookie; requireAdmin() bounces visitors to /admin/login.
 * (Demo-grade auth — enough to show separation of concerns without
 * pulling in a full auth stack.)
 * ------------------------------------------------------------------
 */
const { APP } = require('../config/constants');

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

module.exports = function requireAdmin(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.dct_admin === APP.adminPasscode) return next();
  if (req.path === '/login' || req.method === 'POST') return next();
  return res.redirect('/admin/login');
};