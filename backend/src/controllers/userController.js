// controllers/userController.js
const User = require('../models/userModel');
const Card = require('../models/cardModel');

// Get logged-in user's profile (using token)
const getUserProfile = async (req, res) => {
    const start = process.hrtime();
    try {
        const dbStart = process.hrtime();
        const user = await User.findById(req.user._id).select(
            'username email isAdmin packs openedPacks featuredCards cards twitchProfilePic xp level achievements'
        ).lean();
        const dbEnd = process.hrtime(dbStart);
        console.log(`[PERF] [getUserProfile] DB query took ${dbEnd[0] * 1000 + dbEnd[1] / 1e6} ms`);
        if (!user) {
            const total = process.hrtime(start);
            console.log(`[PERF] [getUserProfile] TOTAL (user not found): ${total[0] * 1000 + total[1] / 1e6} ms`);
            return res.status(404).json({ message: 'User not found' });
        }
        const total = process.hrtime(start);
        console.log(`[PERF] [getUserProfile] TOTAL: ${total[0] * 1000 + total[1] / 1e6} ms`);
        res.status(200).json(user);
    } catch (error) {
        const total = process.hrtime(start);
        console.error(`[PERF] [getUserProfile] ERROR after ${total[0] * 1000 + total[1] / 1e6} ms:`, error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get profile by username (for viewing other users� profiles)
const getProfileByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select(
            'username email isAdmin openedPacks featuredCards cards twitchProfilePic xp level achievements'
        ).lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching profile by username:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get featured cards for logged-in user
const getFeaturedCards = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('featuredCards').lean();
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        // Enrich the featured cards with flavorText from the Card model
        const enrichedFeaturedCards = await Promise.all(
            user.featuredCards.map(async (featuredCard) => {
                const cardDoc = await Card.findOne({ name: featuredCard.name });
                return {
                    ...featuredCard.toObject(),
                    flavorText: cardDoc?.flavorText || 'No description available',
                };
            })
        );
        res.status(200).json({ featuredCards: enrichedFeaturedCards });
    } catch (error) {
        console.error('[getFeaturedCards] Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch featured cards' });
    }
};

// Update user's featured cards, securely
const updateFeaturedCards = async (req, res) => {
    try {
        // Expecting an array of card IDs in { featuredCards: [...] }
        const { featuredCards } = req.body;

        // Basic validation
        if (!Array.isArray(featuredCards) || featuredCards.length > 4) {
            return res.status(400).json({
                message: 'Invalid featured cards. Provide an array of up to 4 card IDs.',
            });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Build a new array of subdocs from user.cards
        const newFeatured = [];
        for (const cardId of featuredCards) {
            // Verify user actually owns this card in user.cards
            const ownedSubdoc = user.cards.find(
                (c) => c._id.toString() === cardId
            );
            if (!ownedSubdoc) {
                return res.status(400).json({
                    message: `You cannot feature card '${cardId}' because you do not own it.`,
                });
            }
            // Push the real subdoc from user.cards (so no extra fields can be injected)
            newFeatured.push(ownedSubdoc);
        }

        user.featuredCards = newFeatured;
        await user.save();

        return res.status(200).json({
            message: 'Featured cards updated successfully',
            featuredCards: user.featuredCards,
        });
    } catch (error) {
        console.error('[updateFeaturedCards] Error:', error.message);
        res.status(500).json({ message: 'Failed to update featured cards' });
    }
};

// Search for users by username
const searchUsers = async (req, res) => {
    const { query } = req.query;
    try {
        if (!query) {
            return res.status(400).json({ message: 'Search query is required' });
        }
        const users = await User.find({
            username: { $regex: query, $options: 'i' },
        }).select('username').lean();
        res.status(200).json(users);
    } catch (error) {
        console.error('[User Search] Error:', error.message);
        res.status(500).json({ message: 'Server error while searching for users' });
    }
};

module.exports = {
    getUserProfile,
    getProfileByUsername,
    getFeaturedCards,
    updateFeaturedCards,
    searchUsers,
};
