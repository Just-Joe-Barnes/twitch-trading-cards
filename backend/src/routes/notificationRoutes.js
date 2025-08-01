// src/routes/notificationRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Notification = require('../models/notificationModel');
const { protect } = require('../middleware/authMiddleware');

// GET all notifications for the logged-in user
router.get('/', protect, async (req, res) => {
    const start = process.hrtime();
    try {
        const dbStart = process.hrtime();
        const notifications = await Notification.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();
        const dbEnd = process.hrtime(dbStart);
        console.log(`[PERF] [notifications] DB query took ${dbEnd[0] * 1000 + dbEnd[1] / 1e6} ms`);
        const total = process.hrtime(start);
        console.log(`[PERF] [notifications] TOTAL: ${total[0] * 1000 + total[1] / 1e6} ms`);
        res.status(200).json(notifications);
    } catch (error) {
        const total = process.hrtime(start);
        console.error(`[PERF] [notifications] ERROR after ${total[0] * 1000 + total[1] / 1e6} ms:`, error.message);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// PUT to mark all notifications as read
router.put('/read', protect, async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.user._id, isRead: false },
            { $set: { isRead: true } }
        );
        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking notifications as read:', error.message);
        res.status(500).json({ message: 'Error updating notifications' });
    }
});

// DELETE all notifications (clear)
router.delete('/clear', protect, async (req, res) => {
    try {
        await Notification.deleteMany({ userId: req.user._id });
        res.status(200).json({ message: 'All notifications cleared' });
    } catch (error) {
        console.error('Error clearing notifications:', error.message);
        res.status(500).json({ message: 'Error clearing notifications' });
    }
});

// DELETE a single notification by ID
router.delete('/:notificationId', protect, async (req, res) => {
    try {
        const { notificationId } = req.params;
        // Ensure notificationId is a valid MongoDB ObjectId
        const isValidObjectId = mongoose.Types.ObjectId.isValid(notificationId);
        if (!isValidObjectId) {
            return res.status(400).json({ message: 'Invalid notification ID format' });
        }

        const userId = req.user._id;
        const result = await Notification.deleteOne({ _id: notificationId, userId });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error.message);
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

module.exports = router;
