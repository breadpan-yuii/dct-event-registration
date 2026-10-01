/**
 * middleware/flash.js
 * ------------------------------------------------------------------
 * Temporary one-shot messages passed through the query string on
 * redirects (no session store needed). Sets res.locals.flash for
 * the layout to render.
 * ------------------------------------------------------------------
 */
module.exports = function flash(req, res, next) {
  const msg = req.query.msg;
  if (msg) {
    res.locals.flash = { message: msg, type: req.query.type === 'error' ? 'error' : 'success' };
  } else {
    res.locals.flash = null;
  }
  next();
};