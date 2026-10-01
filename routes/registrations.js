/**
 * routes/registrations.js — receipt (by reference code) + lookup.
 * NOTE: static routes must be declared before the :reference param.
 */
const express = require('express');
const registrationController = require('../controllers/registrationController');

const router = express.Router();

router.get('/lookup', registrationController.lookupForm);
router.post('/lookup', registrationController.lookupSubmit);
router.post('/:reference/cancel', registrationController.cancel);
router.get('/:reference', registrationController.confirm);

module.exports = router;