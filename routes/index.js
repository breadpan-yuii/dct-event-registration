/**
 * routes/index.js — root route (home page).
 */
const express = require('express');
const homeController = require('../controllers/homeController');

const router = express.Router();

router.get('/', homeController.index);

module.exports = router;