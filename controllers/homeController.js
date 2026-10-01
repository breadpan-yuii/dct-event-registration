/**
 * controllers/homeController.js
 * MVC: CONTROLLER — gathers data from the Model layer and picks the
 * View to render. No SQL/HTML here; only choreography.
 */
const { createModels } = require('../models');

const { eventModel } = createModels();

/** Decorate an event with live registration metadata. */
async function decorate(event) {
  const [seatsLeft, fill, open, past] = await Promise.all([
    eventModel.seatsAvailable(event),
    eventModel.fillPercent(event),
    eventModel.isOpen(event),
    eventModel.isPast(event),
  ]);
  return { ...event, seatsLeft, fill, open, past };
}

exports.index = async function index(req, res, next) {
  try {
    const upcoming = await eventModel.upcoming();
    const featured = await Promise.all(upcoming.slice(0, 6).map(decorate));

    res.render('layout', {
      title: `${req.app.locals.school.shortName} Event Registration`,
      body: 'index',
      activeNav: 'home',
      navClass: 'nav-transparent',
      upcoming: featured,
      hasUpcoming: featured.length > 0,
    });
  } catch (err) {
    next(err);
  }
};