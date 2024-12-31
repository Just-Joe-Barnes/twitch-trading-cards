const express = require('express');
const router = express.Router();
const User = require('../models/userModel');

router.get('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id.trim(); // Trimming to avoid newline issues
        console.log('Fetching collection for userId:', userId);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log('Fetched user:', user);

        // Ensure the user.cards is an array
        return res.json({ cards: user.cards || [] });
    } catch (error) {
        console.error('Error fetching collection:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
