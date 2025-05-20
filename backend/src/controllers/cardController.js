// src/controllers/cardController.js

const Card = require('../models/cardModel');
const User = require('../models/userModel');

exports.getCardAvailability = async (req, res) => {
    try {
        const cards = await Card.find({});
        const users = await User.find({}, { cards: 1 });

        const ownedCountMap = {};

        users.forEach(user => {
            user.cards.forEach(userCard => {
                const name = userCard.name;
                const rarity = userCard.rarity;
                if (!ownedCountMap[name]) ownedCountMap[name] = {};
                if (!ownedCountMap[name][rarity]) ownedCountMap[name][rarity] = 0;
                ownedCountMap[name][rarity]++;
            });
        });

        const result = [];
        cards.forEach(card => {
            if (!card.rarities) return;
            card.rarities.forEach(rarityObj => {
                const cardName = card.name;
                const rarity = rarityObj.rarity;
                const total = rarityObj.totalCopies;
                const owned = ownedCountMap[cardName]?.[rarity] || 0;
                const remaining = total - owned;

                result.push({
                    cardId: card._id,
                    name: cardName,
                    rarity: rarity,
                    total: total,
                    owned: owned,
                    remaining: remaining < 0 ? 0 : remaining
                });
            });
        });

        res.json({ availability: result });
    } catch (error) {
        console.error('Error in getCardAvailability:', error);
        res.status(500).json({ error: 'Failed to get card availability' });
    }
};
