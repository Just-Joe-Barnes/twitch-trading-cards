// routes/userRoutes.js
const express = require('express');
const {
    getUserProfile,
    getProfileByUsername,
    getFeaturedCards,
    updateFeaturedCards,
    searchUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const Card = require('../models/cardModel');

const router = express.Router();

// Protected route to fetch the logged-in user's profile
router.get('/me', protect, getUserProfile);

// NEW: Route to fetch a user's profile by username
router.get('/profile/:username', protect, getProfileByUsername);

// Route to award a first login pack
router.post('/packs/firstlogin', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (user.firstLogin) {
            return res.status(400).json({ message: 'First login pack already claimed' });
        }
        user.firstLogin = true;
        user.packs += 1;
        await user.save();
        return res.json({ message: 'First login pack awarded', packs: user.packs });
    } catch (err) {
        console.error('Error awarding first login pack:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Route to fetch user's featured cards
router.get('/featured-cards', protect, getFeaturedCards);

// Route to update user's featured cards
router.put('/featured-cards', protect, updateFeaturedCards);

// Route to fetch all cards in the user's collection
router.get('/:userId/collection', protect, async (req, res) => {
    try {
        // If not admin, ensure userId matches the token's req.userId
        if (!req.isAdmin && req.params.userId !== req.userId) {
            return res
                .status(403)
                .json({ message: 'You do not have permission to view this user�s collection.' });
        }

        const user = await User.findById(req.params.userId)
            .select('cards packs')
            .populate('cards');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ cards: user.cards, packs: user.packs });
    } catch (err) {
        console.error('[GET /collection] Error:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to fetch a user's opened packs
router.get('/opened-packs', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('openedPacks');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.status(200).json({ openedPacks: user.openedPacks });
    } catch (err) {
        console.error('Error fetching opened packs:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// User Search Route
router.get('/search', protect, searchUsers);

module.exports = router;
