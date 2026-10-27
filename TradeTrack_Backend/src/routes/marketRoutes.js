const express = require('express');
const router = express.Router();
const marketController = require('../controllers/marketController');

router.get('/status', marketController.getMarketStatus);
router.get('/quotes', marketController.getQuotes);

module.exports = router;
