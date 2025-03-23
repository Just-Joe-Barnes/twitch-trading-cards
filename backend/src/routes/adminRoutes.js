// File: backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');
const { broadcastNotification } = require('../../notificationService');

// Middleware to check admin privileges
const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

// API to clear all cards for a specific user
router.post('/clear-cards', protect, adminOnly, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required to clear cards.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        // Clear the cards array
        user.cards = [];
        await user.save();
        res.json({ message: 'All cards removed successfully.' });
    } catch (error) {
        console.error('Error clearing cards:', error);
        res.status(500).json({ error: 'Failed to clear cards.' });
    }
});

// API to set all users' pack count to 6
router.post('/set-packs', protect, adminOnly, async (req, res) => {
    try {
        const result = await User.updateMany({}, { packs: 6 });
        res.json({ message: 'All users now have 6 packs.', updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating pack count for all users:', error);
        res.status(500).json({ error: 'Failed to update packs for all users.' });
    }
});

// New endpoint: Broadcast custom notification to all users
router.post('/notifications', protect, adminOnly, async (req, res) => {
    const { type, message } = req.body;
    if (!type || !message) {
        return res.status(400).json({ message: 'Type and message are required.' });
    }
    try {
        const notification = {
            type,
            message,
            link: "", // default empty link
            extra: {},
            isRead: false,
            createdAt: new Date()
        };

        console.log("[AdminRoutes] Broadcasting notification:", notification);

        // Update the database: push the notification into every user's notifications array
        await User.updateMany({}, { $push: { notifications: notification } });

        // Emit a real-time notification event to all connected clients
        broadcastNotification(notification);

        res.status(200).json({ message: 'Notification broadcast successfully.' });
    } catch (error) {
        console.error('Error broadcasting notification:', error.message);
        res.status(500).json({ message: 'Error broadcasting notification.' });
    }
});

// GET list of users (id + username + packs)
router.get('/users', protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find({}, 'username packs');
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// POST give X packs to a single user
router.post('/give-packs', protect, adminOnly, async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== 'number') {
        return res.status(400).json({ error: 'User ID and pack amount required.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        user.packs = (user.packs || 0) + amount;
        await user.save();
        res.json({ message: `Added ${amount} packs to ${user.username}.` });
    } catch {
        res.status(500).json({ error: 'Failed to give packs.' });
    }
});


module.exports = router;
