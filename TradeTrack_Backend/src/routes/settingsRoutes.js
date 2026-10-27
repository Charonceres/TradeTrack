const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/profile', settingsController.getProfile);
router.put('/profile', settingsController.updateProfile);

module.exports = router;
