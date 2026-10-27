const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');

router.get('/', tradeController.getAllTrades);
router.get('/export/csv', tradeController.exportTradesCsv);
router.post('/reset', tradeController.resetSampleTrades);
router.get('/:id', tradeController.getTradeById);
router.post('/', tradeController.createTrade);
router.put('/:id', tradeController.updateTrade);
router.delete('/:id', tradeController.deleteTrade);

module.exports = router;
