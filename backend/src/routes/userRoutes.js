const express = require('express');
const {
    getUserProfile,
    getProfileByUsername, // NEW: fetch profile by username
    getFeaturedCards,
    updateFeaturedCards,
    searchUsers,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const Card = require('../models/cardModel'); // Ensure Card model is imported

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

// Route to update user's featured cards
router.put('/featured-cards', protect, updateFeaturedCards);

// Route to fetch user's featured cards
router.get('/featured-cards', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('featuredCards');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Enrich featured cards with flavorText from the Card model
        const enrichedFeaturedCards = await Promise.all(
            user.featuredCards.map(async (featuredCard) => {
                const card = await Card.findOne({ name: featuredCard.name });
                return {
                    ...featuredCard.toObject(),
                    flavorText: card?.flavorText || 'No description available',
                };
            })
        );
        res.status(200).json({ featuredCards: enrichedFeaturedCards });
    } catch (err) {
        console.error('Error fetching featured cards:', err.message);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Route to fetch all cards in the user's collection
router.get('/:userId/collection', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('cards packs');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json({ cards: user.cards, packs: user.packs });
    } catch (err) {
        console.error('[GET /collection] Error fetching user collection:', err.message);
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
