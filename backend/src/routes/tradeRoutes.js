// routes/tradeRoutes.js
const express = require('express');
const router = express.Router();
const tradeController = require('../controllers/tradeController');
const { protect } = require('../middleware/authMiddleware');

// Helper to ensure user can only view their own trades (unless admin)
function canViewUserTrades(req, res, next) {
    if (!req.isAdmin && req.params.userId !== req.userId) {
        return res.status(403).json({ message: 'You do not have permission to view these trades.' });
    }
    next();
}

// Create a new trade
router.post('/', protect, tradeController.createTrade);

// Get all trades for a user
router.get('/:userId', protect, canViewUserTrades, tradeController.getTradesForUser);

// Get only pending trades for a user
router.get('/:userId/pending', protect, canViewUserTrades, tradeController.getPendingTrades);

// Update trade status (accept, reject, cancel)
router.put('/:tradeId/status', protect, tradeController.updateTradeStatus);

module.exports = router;
