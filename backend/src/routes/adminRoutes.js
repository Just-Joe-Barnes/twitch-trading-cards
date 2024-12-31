// File: backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

// API to clear all cards for a specific user
router.post('/clear-cards', async (req, res) => {
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

module.exports = router;
