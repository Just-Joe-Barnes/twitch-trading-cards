const mongoose = require('mongoose');
const User = require('../models/userModel');

// Controller for the collection page (logged-in user's collection)
const getLoggedInUserCollection = async (req, res) => {
    try {
        const { search = '', rarity = '', sort = '', page = 1, limit = 30 } = req.query;

        const match = { _id: req.user._id };
        const pipeline = [
            { $match: match },
            { $unwind: '$cards' }
        ];

        if (search) {
            pipeline.push({ $match: { 'cards.name': { $regex: search, $options: 'i' } } });
        }

        if (rarity) {
            pipeline.push({ $match: { 'cards.rarity': { $regex: `^${rarity}$`, $options: 'i' } } });
        }

        const sortField = sort === 'rarity' ? 'cards.rarity' : 'cards.name';
        pipeline.push({ $sort: { [sortField]: 1 } });

        const skip = (parseInt(page) - 1) * parseInt(limit);
        pipeline.push({
            $facet: {
                data: [
                    { $skip: skip },
                    { $limit: parseInt(limit) },
                    { $replaceRoot: { newRoot: '$cards' } },
                    {
                        $lookup: {
                            from: 'modifiers',
                            localField: 'modifier',
                            foreignField: '_id',
                            as: 'modifier'
                        }
                    },
                    { $unwind: { path: '$modifier', preserveNullAndEmptyArrays: true } }
                ],
                total: [{ $count: 'count' }]
            }
        });

        const result = await User.aggregate(pipeline);
        const data = result[0].data;
        const totalCards = result[0].total[0]?.count || 0;

        return res.status(200).json({
            totalCards,
            totalPages: Math.ceil(totalCards / limit),
            currentPage: parseInt(page, 10),
            cards: data
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
