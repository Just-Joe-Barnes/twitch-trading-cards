const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const Card = require('../models/cardModel');
const { protect } = require('../middleware/authMiddleware');

// GET /api/bounty/wanted - Get a list of users and their wanted cards
router.get('/wanted', protect, async (req, res) => {
    try {
        // Find all users who have a favoriteCard set
        const bounties = await User.find({
            'favoriteCard.name': { $ne: null },
            'favoriteCard.rarity': { $ne: null }
        })
            .select('username favoriteCard selectedTitle')
            .populate('selectedTitle', 'name color gradient isAnimated effect')
            .lean();

        // For each user, find a matching card to get its details (like imageUrl)
        const bountiesWithDetails = await Promise.all(bounties.map(async (bounty) => {
            if (!bounty.favoriteCard || !bounty.favoriteCard.name || !bounty.favoriteCard.rarity) {
                return null;
            }

            const cardDetails = await Card.findOne({
                name: bounty.favoriteCard.name
            })
                .select('imageUrl flavorText lore loreAuthor');

            return {
                user: {
                    username: bounty.username,
                    _id: bounty._id,
                    selectedTitle: bounty.selectedTitle || null
                },
                wantedCard: {
                    name: bounty.favoriteCard.name,
                    rarity: bounty.favoriteCard.rarity,
                    imageUrl: cardDetails ? cardDetails.imageUrl : null,
                    flavorText: cardDetails ? cardDetails.flavorText : null,
                    lore: cardDetails ? cardDetails.lore : null,
                    loreAuthor: cardDetails ? cardDetails.loreAuthor : null,
                }
            };
        }));

        // Filter out any entries where no card details were found
        const filteredBounties = bountiesWithDetails.filter(bounty => bounty !== null);

        res.status(200).json(filteredBounties);
    } catch (error) {
        console.error('Error fetching bounty board:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
