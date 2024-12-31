const express = require('express');
const router = express.Router();
const Card = require('../models/cardModel');

// API to seed cards
router.post('/seed', async (req, res) => {
    const cards = [
        { name: 'Dragon', imageUrl: '/public/images/cards/dragon.png', flavorText: 'COMMON DRAGON', rarity: 'Common', totalCopies: 500, remainingCopies: 500 },
        { name: 'Dragon', imageUrl: '/images/dragon.jpg', flavorText: 'The fiery beast.', rarity: 'Uncommon', totalCopies: 300, remainingCopies: 300 },
        { name: 'Dragon', imageUrl: '/images/dragon.jpg', flavorText: 'The fiery beast.', rarity: 'Rare', totalCopies: 100, remainingCopies: 100 },
        { name: 'Dragon', imageUrl: '/images/dragon.jpg', flavorText: 'The fiery beast.', rarity: 'Legendary', totalCopies: 20, remainingCopies: 20 },
        { name: 'Dragon', imageUrl: '/images/dragon.jpg', flavorText: 'The fiery beast.', rarity: 'Mythic', totalCopies: 1, remainingCopies: 1 },
    ];

    try {
        await Card.insertMany(cards);
        res.json({ message: 'Cards seeded successfully.' });
    } catch (error) {
        console.error('Error seeding cards:', error);
        res.status(500).json({ error: 'Failed to seed cards.' });
    }
});

module.exports = router;
