const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');  // Ensure this matches your folder structure

// Create a new trade
router.post('/', protect, tradeController.createTrade);

// Get all trades for a user (incoming and outgoing)
router.get('/:userId', protect, tradeController.getTradesForUser);

// Get only pending trades for a user
router.get('/:userId/pending', protect, tradeController.getPendingTrades);

// Update trade status (accept, reject, cancel)
router.put('/:tradeId/status', protect, tradeController.updateTradeStatus);

module.exports = router;
