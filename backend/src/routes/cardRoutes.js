// backend/src/routes/cardRoutes.js
const express = require('express');
const router = express.Router();
const { protect, optionalProtect} = require('../middleware/authMiddleware');
const Card = require('../models/cardModel');
const User = require('../models/userModel');
const { getCardAvailability } = require("../controllers/cardController");


router.get('/', optionalProtect, async (req, res) => {
    try {
        const {
            search = '',
            rarity = '',
            sort = '',
            page = 1,
            limit = 50,
            view = 'public',
        } = req.query;

        const query = { isHidden: { $ne: true } };

        if (view === 'admin' && req.user?.isAdmin) {
            delete query.isHidden;
        }

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (rarity) {
            query['rarities.rarity'] = rarity;
        }

        let sortOption = { name: 1 };
        if (sort) {
            const direction = sort.startsWith('-') ? -1 : 1;
            const field = sort.replace(/^-/, '');
            sortOption = { [field]: direction };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [cards, totalCards] = await Promise.all([
            Card.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Card.countDocuments(query),
        ]);

        res.status(200).json({
            cards,
            totalCards,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Error fetching cards:', error.message);
        res.status(500).json({ message: 'Failed to fetch cards', error: error.message });
    }
});

router.get('/availability', async (req, res) => {
    try {
        const data = await getCardAvailability();
        res.json(data);
    } catch (error) {
        console.error('Error fetching card availability:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// General paginated card list with optional filters
// GET /api/cards?search=&rarity=&sort=&page=&limit=
router.get('/', async (req, res) => {
    try {
        const {
            search = '',
            rarity = '',
            sort = '',
            page = 1,
            limit = 50,
        } = req.query;

        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (rarity) {
            query['rarities.rarity'] = rarity;
        }

        let sortOption = {};
        if (sort) {
            // Example: sort=name or sort=-name
            const direction = sort.startsWith('-') ? -1 : 1;
            const field = sort.replace(/^-/, '');
            sortOption[field] = direction;
        } else {
            sortOption = { name: 1 }; // default sort by name ascending
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [cards, totalCards] = await Promise.all([
            Card.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Card.countDocuments(query),
        ]);

        res.status(200).json({
            cards,
            totalCards,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Error fetching cards:', error.message);
        res.status(500).json({ message: 'Failed to fetch cards', error: error.message });
    }
});

// NEW: Search route placed first so it isn't masked by dynamic routes
// GET /api/cards/search?name=...
router.get('/search', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ message: 'Name query parameter is required.' });
    }
    try {
        console.log('Searching for cards with name:', name);
        // Search for cards where the name matches (case-insensitive)
        const cards = await Card.find({ name: { $regex: name, $options: 'i' } })
            .lean();
        console.log('Search results:', cards);
        res.status(200).json({ cards });
    } catch (err) {
        console.error('Error searching cards:', err);
        res.status(500).json({ message: 'Failed to search cards', error: err.message });
    }
});

// Fetch cards by rarity
router.get('/rarity/:rarity', protect, async (req, res) => {
    try {
        const { rarity } = req.params;
        const user = await User.findById(req.user._id).populate('cards');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const filteredCards = user.cards
            .filter((card) => card.rarities.some((r) => r.rarity === rarity))
            .map((card) => ({
                ...card.toObject(),
                maxMint: card.rarities.find((r) => r.rarity === rarity)?.totalCopies || '???',
            }));
        res.status(200).json({ cards: filteredCards });
    } catch (error) {
        console.error('Error fetching cards by rarity:', error.message);
        res.status(500).json({ message: 'Failed to fetch cards by rarity.' });
    }
});

// Fetch featured cards for the user
router.get('/featured-cards', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'featuredCards',
            model: Card,
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const enrichedFeaturedCards = user.featuredCards.map((card) => ({
            ...card.toObject(),
            maxMint: card.rarities.find((r) => r.rarity === card.rarity)?.totalCopies || '???',
        }));
        res.status(200).json({ featuredCards: enrichedFeaturedCards });
    } catch (error) {
        console.error('Error fetching featured cards:', error.message);
        res.status(500).json({ message: 'Failed to fetch featured cards.' });
    }
});

// Fetch user collection (for authenticated users)
router.get('/collection', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate({
            path: 'cards',
            model: Card,
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const enrichedCards = user.cards.map((card) => ({
            ...card.toObject(),
            maxMint: card.rarities.find((r) => r.rarity === card.rarity)?.totalCopies || '???',
        }));
        res.status(200).json({ cards: enrichedCards });
    } catch (error) {
        console.error('Error fetching card collection:', error.message);
        res.status(500).json({ message: 'Failed to fetch card collection.' });
    }
});


// Dynamic route for a single card must come last to prevent conflict with /search
// GET /api/cards/search?name=...
router.get('/:cardId', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('cards');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const card = user.cards.find((card) => card._id.toString() === req.params.cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found in your collection.' });
        }
        const enrichedCard = {
            ...card.toObject(),
            maxMint: card.rarities.find((r) => r.rarity === card.rarity)?.totalCopies || '???',
        };
        res.status(200).json({ card: enrichedCard });
    } catch (error) {
        console.error('Error fetching card:', error.message);
        res.status(500).json({ message: 'Failed to fetch card.' });
    }
});

module.exports = router;
