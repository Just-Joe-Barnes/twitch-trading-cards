// src/controllers/cardController.js

const Card = require('../models/cardModel');
const User = require('../models/userModel');

exports.getCardAvailability = async (req, res) => {
    try {
        // Count owned cards grouped by name and rarity
        const ownedCounts = await User.aggregate([
            { $unwind: '$cards' },
            {
                $group: {
                    _id: { name: '$cards.name', rarity: '$cards.rarity' },
                    owned: { $sum: 1 }
                }
            }
        ]);

        const ownedMap = {};
        ownedCounts.forEach((c) => {
            ownedMap[`${c._id.name}|${c._id.rarity}`] = c.owned;
        });

        const cards = await Card.aggregate([
            { $unwind: '$rarities' },
            {
                $project: {
                    cardId: '$_id',
                    name: '$name',
                    rarity: '$rarities.rarity',
                    total: '$rarities.totalCopies'
                }
            }
        ]);

        const result = cards.map((c) => {
            const key = `${c.name}|${c.rarity}`;
            const owned = ownedMap[key] || 0;
            return {
                cardId: c.cardId,
                name: c.name,
                rarity: c.rarity,
                total: c.total,
                owned,
                remaining: c.total - owned < 0 ? 0 : c.total - owned
            };
        });

        res.json({ availability: result });
    } catch (error) {
        console.error('Error in getCardAvailability:', error);
        res.status(500).json({ error: 'Failed to get card availability' });
    }
};
