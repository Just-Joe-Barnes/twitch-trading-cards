// src/controllers/packController.js
const Card = require('../models/cardModel');

const openPack = async (req, res) => {
    try {
        // Mock: Retrieve cards to add in the pack
        const cards = await Card.find().limit(5); // Fetch 5 random cards
        res.status(200).json({ cards });
    } catch (error) {
        console.error('Error opening pack:', error.message);
        res.status(500).json({ error: true, message: 'Failed to open pack.' });
    }
};

module.exports = {
    openPack,
};
