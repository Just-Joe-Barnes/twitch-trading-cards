// src/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');

// GET all notifications for the logged-in user
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('notifications');
        res.status(200).json(user.notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error.message);
        res.status(500).json({ message: 'Error fetching notifications' });
    }
});

// PUT to mark all notifications as read
router.put('/read', protect, async (req, res) => {
    try {
        await User.updateOne(
            { _id: req.user.id },
            { $set: { 'notifications.$[].isRead': true } }
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
        await User.updateOne({ _id: req.user.id }, { $set: { notifications: [] } });
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

        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.notifications.pull({ _id: new mongoose.Types.ObjectId(notificationId) });
        await user.save();

        res.status(200).json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Error deleting notification:', error.message);
        res.status(500).json({ message: 'Error deleting notification' });
    }
});

module.exports = router;
