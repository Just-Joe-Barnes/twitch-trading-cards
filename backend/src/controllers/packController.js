const Pack = require('../models/packModel');
const User = require('../models/userModel');
const { generateCardWithProbability } = require('../helpers/cardHelpers');

// Get all users with packs (Admin-only functionality)
const getUsersWithPacks = async (req, res) => {
    try {
        const usersWithPacks = await User.find({ packs: { $gt: 0 } }).select('username packs');
        res.status(200).json({ users: usersWithPacks });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users with packs' });
    }
};

// Open a single pack (User functionality)
const openPack = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.packs <= 0) {
            return res.status(400).json({ message: 'No unopened packs available' });
        }

        const newCard = await generateCardWithProbability();

        if (!newCard) {
            return res.status(500).json({ message: 'Failed to generate a card' });
        }

        const updatedCard = {
            ...newCard,
            flavorText: newCard.flavorText || 'No flavor text available',
        };

        user.cards.push(updatedCard);
        user.openedPacks += 1; // Increment opened packs
        user.packs -= 1;

        // Save user changes
        await user.save();

        res.status(200).json({ message: 'Pack opened successfully', card: updatedCard, packs: user.packs });
    } catch (error) {
        console.error('[openPack] Error:', error.message);
        res.status(500).json({ message: 'Failed to open pack' });
    }
};

// Get all packs (Admin-only functionality)
const getAllPacks = async (req, res) => {
    try {
        const packs = await Pack.find();
        res.status(200).json({ packs });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all packs' });
    }
};

// Open packs for a specific user (Admin functionality)
const openPacksForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.packs <= 0) {
            return res.status(400).json({ message: 'No unopened packs available for this user' });
        }

        const newCards = [];
        for (let i = 0; i < 5; i++) {
            const card = await generateCardWithProbability();
            if (card) {
                newCards.push({
                    ...card,
                    flavorText: card.flavorText || 'No flavor text available',
                });
            }
        }

        if (!newCards.length) {
            return res.status(500).json({ message: 'Failed to generate cards for the pack' });
        }

        user.packs -= 1;
        user.openedPacks += 1;
        user.cards.push(...newCards);

        await user.save();

        res.status(200).json({ message: 'Pack opened successfully', newCards });
    } catch (error) {
        console.error('[Open Packs for User] Error:', error.message);
        res.status(500).json({ message: 'Failed to open pack' });
    }
};

// Fetch unopened packs for the authenticated user
const getMyPacks = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ packs: user.packs });
    } catch (error) {
        console.error('[getMyPacks] Error:', error);
        res.status(500).json({ message: 'Failed to fetch user packs' });
    }
};

// Open a specific pack by ID (Admin functionality)
const openPackById = async (req, res) => {
    try {
        const { packId } = req.params;

        const pack = await Pack.findById(packId);

        if (!pack) {
            return res.status(404).json({ message: 'Pack not found' });
        }

        const cards = [];
        for (let i = 0; i < 5; i++) {
            const card = await generateCardWithProbability();
            if (card) {
                cards.push({
                    ...card,
                    flavorText: card.flavorText || 'No flavor text available',
                });
            }
        }

        if (!cards.length) {
            return res.status(500).json({ message: 'Failed to generate cards' });
        }

        res.status(200).json({ message: 'Pack opened successfully', cards });
    } catch (error) {
        console.error('[openPackById] Error:', error.message);
        res.status(500).json({ message: 'Failed to open pack by ID' });
    }
};

module.exports = {
    getUsersWithPacks,
    openPack,
    getAllPacks,
    openPacksForUser,
    getMyPacks,
    openPackById, // Ensure this is exported
};
