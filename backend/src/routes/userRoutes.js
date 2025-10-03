// routes/userRoutes.js
const express = require('express');
const {
    getUserProfile,
    getProfileByUsername,
    getFeaturedCards,
    updateFeaturedCards,
    getFeaturedAchievements,
    updateFeaturedAchievements,
    getFavoriteCard,
    updateFavoriteCard,
    getPreferredPack,
    updatePreferredPack,
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

// Route to fetch user's featured cards
router.get('/featured-cards', protect, getFeaturedCards);

// Route to update user's featured cards
router.put('/featured-cards', protect, updateFeaturedCards);

// Routes for featured achievements
router.get('/featured-achievements', protect, getFeaturedAchievements);
router.put('/featured-achievements', protect, updateFeaturedAchievements);

// Favorite card routes
router.get('/favorite-card', protect, getFavoriteCard);
router.put('/favorite-card', protect, updateFavoriteCard);

// Preferred pack routes
router.get('/preferred-pack', protect, getPreferredPack);
router.put('/preferred-pack', protect, updatePreferredPack);

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
        let updated = false;
        const now = Date.now();
        const { finalizeGrade } = require('../controllers/gradingController');
        user.cards.forEach(card => {
            if (!card.slabbed && card.gradingRequestedAt) {
                const diff = now - new Date(card.gradingRequestedAt).getTime();
                if (diff >= 24 * 60 * 60 * 1000) {
                    finalizeGrade(card);
                    updated = true;
                }
            }
        });
        if (updated) {
            await user.save();
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
