// File: backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// Middleware to check admin privileges
const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

// API to clear all cards for a specific user
router.post('/clear-cards', adminOnly, async (req, res) => {
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
router.post('/set-packs', adminOnly, async (req, res) => {
    try {
        const result = await User.updateMany({}, { packs: 6 });
        res.json({ message: 'All users now have 6 packs.', updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating pack count for all users:', error);
        res.status(500).json({ error: 'Failed to update packs for all users.' });
    }
});

// New endpoint: Broadcast custom notification to all users
router.post('/notifications', adminOnly, async (req, res) => {
    const { type, message, link, extra } = req.body;
    if (!type || !message || !link) {
        return res.status(400).json({ message: 'Type, message, and link are required.' });
    }
    try {
        const notification = {
            type,
            message,
            link,
            extra: extra || {},
            isRead: false,
            createdAt: new Date()
        };

        // Push the notification into every user's notifications array
        await User.updateMany({}, { $push: { notifications: notification } });
        res.status(200).json({ message: 'Notification broadcast successfully.' });
    } catch (error) {
        console.error('Error broadcasting notification:', error.message);
        res.status(500).json({ message: 'Error broadcasting notification.' });
    }
});

module.exports = router;
