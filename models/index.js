/**
 * models/index.js
 * ------------------------------------------------------------------
 * Composes the two domain models around a single shared storage
 * instance so every collection is read from one consistent cache.
 * ------------------------------------------------------------------
 */
const Db = require('./db');
const Event = require('./Event');
const Registration = require('./Registration');
const { PATHS } = require('../config/constants');

function createModels() {
  const db = new Db(PATHS.dataDir);
  const eventModel = new Event(null, db);
  const regModel = new Registration(eventModel, db);
  eventModel.regModel = regModel; // close the loop
  return { eventModel, regModel, db };
}

module.exports = { createModels };