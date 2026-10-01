/**
 * routes/admin.js — passcode-gated management area.
 * Static paths (/new, /login) are declared before parameterized ones.
 */
const express = require('express');
const adminController = require('../controllers/adminController');
const requireAdmin = require('../middleware/adminAuth');

const router = express.Router();

// Auth (public)
router.get('/login', adminController.loginForm);
router.post('/login', adminController.login);
router.post('/logout', requireAdmin, adminController.logout);

// Everything below requires the admin cookie
router.use(requireAdmin);

// Dashboard
router.get('/', adminController.dashboard);

// Events
router.get('/events', adminController.eventsIndex);
router.get('/events/new', adminController.eventNew);
router.post('/events', adminController.eventCreate);
router.get('/events/:id/registrations', adminController.eventRegistrations);
router.get('/events/:id/edit', adminController.eventEdit);
router.post('/events/:id', adminController.eventUpdate);
router.post('/events/:id/delete', adminController.eventDelete);

// Registrations
router.post('/registrations/:id/cancel', adminController.registrationCancel);
router.post('/registrations/:id/delete', adminController.registrationDelete);

module.exports = router;