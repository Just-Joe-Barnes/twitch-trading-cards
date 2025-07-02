const Pack = require('../models/packModel');
const User = require('../models/userModel');
const Modifier = require('../models/modifierModel');
const { generateCardWithProbability, generatePack } = require('../helpers/cardHelpers');
// Percentage chance that a card will receive a modifier when a pack is opened.
// Default to 5% if the environment variable is not set.
const MODIFIER_CHANCE = parseFloat(process.env.MODIFIER_CHANCE || '0.05');

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

        const forceModifier = req.body?.forceModifier === true;
        let modifierDoc = null;

        const [newCard, mods] = await Promise.all([
            generateCardWithProbability(),
            Modifier.find().lean(),
        ]);

        if (!newCard) {
            return res.status(500).json({ message: 'Failed to generate a card' });
        }

        if (forceModifier) {
            if (mods && mods.length > 0) {
                const idx = Math.floor(Math.random() * mods.length);
                modifierDoc = mods[idx];
            }
        } else if (mods && mods.length > 0 && Math.random() < MODIFIER_CHANCE) {
            const idx = Math.floor(Math.random() * mods.length);
            modifierDoc = mods[idx];
        }

        if (modifierDoc) {
            newCard.modifier = modifierDoc._id;
            const prefix = modifierDoc.name === 'Glitch' ? 'Glitched' : modifierDoc.name;
            newCard.name = `${prefix} ${newCard.name}`;
        }

        newCard.acquiredAt = new Date();
        user.cards.push(newCard);
        user.openedPacks += 1;
        user.packs -= 1;

        // Award XP for opening a pack
        user.xp = (user.xp || 0) + 10;
        // Level up logic (simple: 100 XP per level)
        user.level = Math.floor(user.xp / 100) + 1;

        await user.save();

        const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(user);

        res.status(200).json({ message: 'Pack opened successfully', card: newCard, packs: user.packs });
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
        const { templateId } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.packs <= 0) {
            return res.status(400).json({ message: 'No unopened packs available for this user' });
        }

        let packPromise;

        if (templateId) {
            const templatePack = await Pack.findById(templateId);
            if (!templatePack) {
                return res.status(404).json({ message: 'Pack template not found' });
            }

            const Card = require('../models/cardModel');
            const now = new Date();
            const poolCards = await Card.find({
                _id: { $in: templatePack.cardPool },
                $or: [
                    { availableFrom: null },
                    { availableFrom: { $lte: now } }
                ],
                $or: [
                    { availableTo: null },
                    { availableTo: { $gte: now } }
                ]
            }).lean();

            const filteredIds = poolCards.map(c => c._id);

            const { generatePackFromPool } = require('../helpers/cardHelpers');
            packPromise = generatePackFromPool(filteredIds, 5);
        } else {
            packPromise = generatePack(5);
        }

        const [newCards, mods] = await Promise.all([
            packPromise,
            Modifier.find().lean(),
        ]);

        if (!newCards || !newCards.length) {
            return res.status(500).json({ message: 'Failed to generate cards for the pack' });
        }
        const forceModifier = req.body?.forceModifier === true;

        for (const newCard of newCards) {
            if (mods && mods.length > 0 && (forceModifier || Math.random() < MODIFIER_CHANCE)) {
                const idx = Math.floor(Math.random() * mods.length);
                const mod = mods[idx];
                newCard.modifier = mod._id;
                const prefix = mod.name === 'Glitch' ? 'Glitched' : mod.name;
                newCard.name = `${prefix} ${newCard.name}`;
            }
            newCard.acquiredAt = new Date();
        }

        user.packs -= 1;
        user.openedPacks += 1;

        // Award XP for admin opening pack
        user.xp = (user.xp || 0) + 10;
        user.level = Math.floor(user.xp / 100) + 1;

        user.cards.push(...newCards);
        await user.save();

        const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(user);

        res.status(200).json({ message: 'Pack opened successfully', newCards });
    } catch (error) {
        console.error('[openPacksForUser] Error:', error.message);
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

        let cards = [];
        if (pack.cardPool && pack.cardPool.length > 0) {
            // Use the pack's specific card pool
            const Card = require('../models/cardModel');
            const now = new Date();
            const poolCards = await Card.find({
                _id: { $in: pack.cardPool },
                $or: [
                    { availableFrom: null },
                    { availableFrom: { $lte: now } }
                ],
                $or: [
                    { availableTo: null },
                    { availableTo: { $gte: now } }
                ]
            });

            for (let i = 0; i < 5; i++) {
                if (poolCards.length === 0) break;
                const randomIndex = Math.floor(Math.random() * poolCards.length);
                const cardDoc = poolCards[randomIndex];
                const rarityObj = cardDoc.rarities[0]; // Simplified, pick first rarity
                cards.push({
                    name: cardDoc.name,
                    imageUrl: cardDoc.imageUrl,
                    flavorText: cardDoc.flavorText,
                    rarity: rarityObj.rarity,
                    mintNumber: 0, // or generate mint number logic
                });
            }
        } else {
            // Fallback to global card pool
            cards = await generatePack(5);
        }

        if (!cards || !cards.length) {
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
    openPackById,
};
