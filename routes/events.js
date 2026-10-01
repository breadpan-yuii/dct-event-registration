/**
 * routes/events.js — public event browsing + registration intake.
 */
const express = require('express');
const eventController = require('../controllers/eventController');

const router = express.Router();

router.get('/', eventController.list);
router.get('/:slug', eventController.detail);
router.get('/:slug/register', eventController.registerForm);
router.post('/:slug/register', eventController.registerSubmit);

module.exports = router;