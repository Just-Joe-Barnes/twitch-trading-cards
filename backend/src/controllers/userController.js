const User = require('../models/userModel');
const Card = require('../models/cardModel');

// Get logged-in user's profile (using token)
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('username email isAdmin openedPacks featuredCards cards');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// NEW: Get profile by username (for viewing other users’ profiles)
const getProfileByUsername = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select('username email isAdmin openedPacks featuredCards cards');
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
        const user = await User.findById(req.user._id).select('featuredCards');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
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
    } catch (error) {
        console.error('[getFeaturedCards] Error:', error.message);
        res.status(500).json({ message: 'Failed to fetch featured cards' });
    }
};

// Update user's featured cards
const updateFeaturedCards = async (req, res) => {
    try {
        const { featuredCards } = req.body;
        if (!featuredCards || !Array.isArray(featuredCards) || featuredCards.length > 4) {
            return res.status(400).json({ message: 'Invalid featured cards. Provide up to 4 cards.' });
        }
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.featuredCards = featuredCards;
        await user.save();
        res.status(200).json({ message: 'Featured cards updated successfully', featuredCards: user.featuredCards });
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
        const users = await User.find({ username: { $regex: query, $options: 'i' } }).select('username');
        res.status(200).json(users);
    } catch (error) {
        console.error('[User Search] Error:', error.message);
        res.status(500).json({ message: 'Server error while searching for users' });
    }
};

module.exports = {
    getUserProfile,
    getProfileByUsername, // NEW export
    getFeaturedCards,
    updateFeaturedCards,
    searchUsers,
};
