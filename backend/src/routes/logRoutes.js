const express = require('express');
const router = express.Router();
const Log = require('../models/logModel');
// You need to ensure both 'protect' and 'admin' are correctly exported from your authMiddleware.js
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @desc    Get all log entries
// @route   GET /api/log
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const logs = await Log.find({})
            .sort({ createdAt: -1 })
            .populate({
                path: 'user',
                select: 'username selectedTitle',
                populate: {
                    path: 'selectedTitle',
                    select: 'name color gradient isAnimated effect'
                }
            })
            .lean(); // Use lean() for faster read performance

        res.status(200).json(logs);
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @desc    Log a user action
// @route   POST /api/log
// @access  Private (Requires authentication)
router.post('/', protect, async (req, res) => {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
        return res.status(400).json({ message: 'Log message is required' });
    }

    try {
        const newLog = new Log({
            user: userId,
            message: message,
        });

        const savedLog = await newLog.save();
        res.status(201).json(savedLog);
    } catch (error) {
        console.error('Error saving log:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
