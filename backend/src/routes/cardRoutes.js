// backend/src/routes/cards.js
const express = require('express');
const { protect } = require('../middleware/authMiddleware'); // Middleware for auth
const router = express.Router();
const User = require('../models/userModel'); // Assuming User schema includes cards
const Card = require('../models/cardModel'); // Import Card model for population

// Fetch all cards in the user's collection
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

// Fetch a single card by ID
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

// Fetch cards filtered by rarity
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

// Update featured cards for the user
router.put('/featured-cards', protect, async (req, res) => {
    try {
        const { featuredCards } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        const validCardIds = featuredCards.filter((cardId) =>
            user.cards.some((userCard) => userCard.toString() === cardId)
        );
        if (validCardIds.length !== featuredCards.length) {
            return res.status(400).json({ message: 'Invalid featured cards selected.' });
        }
        user.featuredCards = validCardIds;
        await user.save();
        res.status(200).json({ message: 'Featured cards updated successfully.' });
    } catch (error) {
        console.error('Error updating featured cards:', error.message);
        res.status(500).json({ message: 'Failed to update featured cards.' });
    }
});

// *** NEW: Catalogue Route ***
// GET /api/cards - Return all cards (for catalogue)
router.get('/', async (req, res) => {
    try {
        const cards = await Card.find({});
        res.status(200).json({ cards, totalCards: cards.length });
    } catch (error) {
        console.error('Error fetching cards:', error.message);
        res.status(500).json({ message: 'Failed to fetch cards.' });
    }
});

// GET /api/cards/search?name=...
router.get('/search', async (req, res) => {
    const { name } = req.query;
    if (!name) {
        return res.status(400).json({ message: 'Name query parameter is required.' });
    }
    try {
        // Search for cards where the name matches (case-insensitive)
        const cards = await Card.find({ name: { $regex: name, $options: 'i' } });
        res.status(200).json({ cards });
    } catch (err) {
        res.status(500).json({ message: 'Failed to search cards', error: err.message });
    }
});

module.exports = router;
