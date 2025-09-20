const Card = require('../models/cardModel');
const User = require('../models/userModel');
const mongoose = require('mongoose');

/**
 * @desc    Fetch cards for the public catalogue with filtering, sorting, and pagination.
 * @route   GET /api/cards
 * @access  Public
 */
const getPublicCards = async (req, res) => {
    try {
        const { search, rarity, sort, page = 1, limit = 50 } = req.query;

        // --- THIS IS THE CRUCIAL SECURITY FILTER ---
        // It ensures that cards marked as 'isHidden: true' are NEVER sent.
        const baseFilter = { isHidden: { $ne: true } };

        // Add search query to the filter if provided
        if (search) {
            // Using a case-insensitive regex for searching by name
            baseFilter.name = { $regex: search, $options: 'i' };
        }

        // Add rarity filter if provided
        if (rarity) {
            // This filters the nested 'rarities' array in the Card document
            baseFilter['rarities.rarity'] = { $regex: `^${rarity}$`, $options: 'i' };
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Fetch the paginated list of cards
        const cards = await Card.find(baseFilter)
            .sort({ name: sort === 'desc' ? -1 : 1 }) // Simple sort by name for now
            .skip(skip)
            .limit(limitNum)
            .lean(); // .lean() for better performance

        // Get the total count of documents that match the filter (for pagination)
        const totalCards = await Card.countDocuments(baseFilter);

        res.json({
            cards,
            page: pageNum,
            pages: Math.ceil(totalCards / limitNum),
            totalCards,
        });

    } catch (error) {
        console.error('Error fetching public cards:', error);
        res.status(500).json({ message: 'Server error while fetching cards.' });
    }
};


async function getCardAvailability(cardIds = []) {
    // Standard input validation
    if (!Array.isArray(cardIds)) {
        cardIds = [];
    }

    // --- Phase 1: Get owned counts from User collection ---
    const ownedCounts = await User.aggregate([
        { '$unwind': '$cards' },
        { '$match': {
                'cards.name': { '$exists': true, '$ne': null },
                'cards.rarity': { '$exists': true, '$ne': null }
            }},
        { '$group': {
                _id: { name: '$cards.name', rarity: '$cards.rarity' },
                owned: { '$sum': 1 }
            }}
    ]);

    // Create a map for quick lookup of owned counts by 'cardName|rarity'
    const ownedMap = new Map();
    ownedCounts.forEach(item => {
        const key = `${String(item._id.name)}|${String(item._id.rarity)}`;
        ownedMap.set(key, item.owned);
    });

    // --- Phase 2: Get all card definitions (or filtered) from Card collection ---
    const cardAggregateQuery = {};
    if (cardIds.length > 0) {
        // If specific cardIds (parent _id's) are provided, filter by them
        cardAggregateQuery['_id'] = { '$in': cardIds.map(id => new mongoose.Types.ObjectId(id)) };
    }

    // --- ADDED SECURITY FILTER ---
    // Ensure hidden cards are not included in availability calculations
    cardAggregateQuery.isHidden = { $ne: true };


    const cards = await Card.aggregate([
        { '$match': cardAggregateQuery }, // Apply filter if cardIds were provided
        { '$unwind': '$rarities' }, // Deconstruct the rarities array
        { '$project': {
                cardId: '$_id', // The main _id of the card document
                name: '$name', // The card's name
                rarity: '$rarities.rarity', // The specific rarity name (e.g., "Basic", "Common")
                total: '$rarities.totalCopies' // Total copies for this rarity
            }
        }
    ]);

    // --- Phase 3: Calculate full availability (original format) ---
    // This `availability` array is what your front-end is currently expecting
    const availability = cards.map(card => {
        let owned = 0;
        // Create the lookup key using name and rarity from the Card collection result
        const lookupKey = `${String(card.name)}|${String(card.rarity)}`;

        if (ownedMap.has(lookupKey)) {
            owned = ownedMap.get(lookupKey);
        }

        return {
            cardId: card.cardId,
            name: card.name,
            rarity: card.rarity,
            total: card.total,
            owned: owned,
            remaining: card.total - owned
        };
    });

    // --- Phase 4: Create the new `rarityRemaining` format ---
    // This will group rarities by cardId and name
    const rarityRemainingMap = new Map(); // Use a Map to group by cardId and name

    availability.forEach(item => {
        // Create a unique key for the outer map (e.g., "67e1d0424cb7cc8feea10af2|The Flamboyance")
        const cardKey = `${String(item.cardId)}|${String(item.name)}`;

        // If this card hasn't been added to our new format yet, initialize it
        if (!rarityRemainingMap.has(cardKey)) {
            rarityRemainingMap.set(cardKey, {
                cardId: item.cardId,
                name: item.name,
                rarityRemaining: {} // This will hold the { rarity: availableCopies } mapping
            });
        }
        // Get the card's entry from the map
        const cardEntry = rarityRemainingMap.get(cardKey);

        // Add the current rarity's available copies, using lowercase rarity name as key
        cardEntry.rarityRemaining[String(item.rarity).toLowerCase()] = item.remaining;
    });

    // Convert the map values (which are our grouped card objects) into an array
    const rarityRemaining = Array.from(rarityRemainingMap.values());

    // --- Final Return: Include both formats ---
    return {
        availability: availability,     // Original format for your front-end
        rarityRemaining: rarityRemaining // New grouped format
    };
}

// Export both functions
module.exports = {
    getPublicCards,
    getCardAvailability
};
