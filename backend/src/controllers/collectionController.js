const mongoose = require('mongoose');
const User = require('../models/userModel');

// Controller for the collection page (logged-in user's collection)
const getLoggedInUserCollection = async (req, res) => {
    try {
        const { search = '', rarity = '', sort = '', page = 1, limit = 30 } = req.query;

        // Retrieve the logged-in user's collection and populate modifier data
        const user = await User.findById(req.user._id)
            .populate('cards.modifier')
            .lean();
        if (!user) {
            console.error('[ERROR] Logged-in user not found:', req.user._id);
            return res.status(404).json({ message: 'User not found' });
        }

        let cards = user.cards;

        // Apply filters
        if (search) {
            cards = cards.filter((card) =>
                card.name.toLowerCase().includes(search.toLowerCase())
            );
        }

        if (rarity) {
            cards = cards.filter((card) => card.rarity.toLowerCase() === rarity.toLowerCase());
        }

        // Sorting logic
        if (sort === 'name') {
            cards.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'rarity') {
            cards.sort((a, b) => a.rarity.localeCompare(b.rarity));
        }

        // Pagination
        const startIndex = (page - 1) * limit;
        const paginatedCards = cards.slice(startIndex, startIndex + limit);

        return res.status(200).json({
            totalCards: cards.length,
            totalPages: Math.ceil(cards.length / limit),
            currentPage: parseInt(page, 10),
            cards: paginatedCards,
        });
    } catch (error) {
        console.error('[ERROR] in getLoggedInUserCollection:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Controller for fetching a specific user's collection by MongoDB ID or username
const getCollectionByIdentifier = async (req, res) => {
    try {
        const identifier = req.params.identifier;
        console.log(`[DEBUG] Received identifier: ${identifier}`);

        let user = null;

        // Explicit ObjectId check
        if (mongoose.Types.ObjectId.isValid(identifier)) {
            console.log(`[DEBUG] Querying by ObjectId: ${identifier}`);
            user = await User.findOne({ _id: identifier })
                .populate('cards.modifier')
                .lean();
        } else {
            console.log(`[DEBUG] Querying by username: ${identifier}`);
            user = await User.findOne({ username: identifier })
                .populate('cards.modifier')
                .lean();
        }

        if (!user) {
            console.error(`[ERROR] User not found for identifier: ${identifier}`);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[DEBUG] User found: ${user.username}`);
        return res.status(200).json({
            cards: user.cards,
            packs: user.packs || 0,
        });
    } catch (error) {
        console.error('[ERROR] in getCollectionByIdentifier:', error.stack); // Full stack trace
        return res.status(500).json({ message: 'Server error.', error: error.message });
    }
};


module.exports = { getLoggedInUserCollection, getCollectionByIdentifier };
