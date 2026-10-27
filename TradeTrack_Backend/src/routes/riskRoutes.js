const express = require('express');
const router = express.Router();
const riskController = require('../controllers/riskController');

router.post('/calculate', riskController.calculateRisk);
router.post('/save', riskController.saveRiskCalculation);
router.get('/history', riskController.getRiskHistory);

module.exports = router;
