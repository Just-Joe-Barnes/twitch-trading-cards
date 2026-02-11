const Pack = require('../models/packModel');
const User = require('../models/userModel');
const Modifier = require('../models/modifierModel');
const {
    generateCardWithProbability,
    generatePack,
    generatePackPreview,
    generatePackPreviewFromPool,
    getModifierPool
} = require('../helpers/cardHelpers');
const { openPackForUserLogic } = require('../helpers/packHelpers');
const Log = require("../models/logModel");
const {createLogEntry} = require("../utils/logService");
const MODIFIER_CHANCE = parseFloat(process.env.MODIFIER_CHANCE || '0.05');
const normalizeModifierName = (name) => (name === 'Aqua' ? 'Glacial' : name);

const getUsersWithPacks = async (req, res) => {
    try {
        const usersWithPacks = await User.find({ packs: { $gt: 0 } }).select('username packs');
        res.status(200).json({ users: usersWithPacks });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch users with packs' });
    }
};

const openPack = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select("packs xp");
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (user.packs <= 0) {
            return res.status(400).json({ message: 'No unopened packs available' });
        }

        const forceModifier = req.body?.forceModifier === true || req.body?.forceModifier === 'true';
        let modifierDoc = null;

        const [newCard, mods] = await Promise.all([
            generateCardWithProbability(),
            getModifierPool(),
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
            const normalizedName = normalizeModifierName(modifierDoc.name);
            const prefix = normalizedName === 'Glitch' ? 'Glitched' : normalizedName;
            newCard.name = `${prefix} ${newCard.name}`;
        }

        newCard.acquiredAt = new Date();

        const xpGain = 10;
        const newXp = (user.xp || 0) + xpGain;
        const newLevel = Math.floor(newXp / 100) + 1;
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                $push: { cards: newCard },
                $inc: { packs: -1, openedPacks: 1, xp: xpGain },
                $set: { level: newLevel }
            },
            { new: true }
        );

        const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(updatedUser);

        res.status(200).json({ message: 'Pack opened successfully', card: newCard, packs: updatedUser.packs });
    } catch (error) {
        console.error('[openPack] Error:', error.message);
        res.status(500).json({ message: 'Failed to open pack' });
    }
};

const getAllPacks = async (req, res) => {
    try {
        const packs = await Pack.find();
        res.status(200).json({ packs });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all packs' });
    }
};

const openPacksForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { templateId } = req.body;
        const forceModifier = req.body?.forceModifier === true || req.body?.forceModifier === 'true';

        const { newCards } = await openPackForUserLogic(userId, templateId, forceModifier);

        res.status(200).json({ message: 'Pack opened successfully', newCards });
    } catch (error) {
        await createLogEntry(
            req.user,
            '[ERROR] Failed to open pack',
            error.message
        );
        console.error('[openPacksForUser] Error:', error.message);
        res.status(500).json({ message: 'Failed to open pack' });
    }
};

const debugOpenPackForUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { templateId } = req.body;
        const forceModifier = req.body?.forceModifier === true || req.body?.forceModifier === 'true';
        console.log('[debugOpenPackForUser] start', { userId, templateId, forceModifier });
        const start = Date.now();

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let pack;
        if (templateId) {
            const templatePack = await Pack.findById(templateId);
            if (!templatePack) {
                return res.status(404).json({ message: 'Pack template not found' });
            }

            const Card = require('../models/cardModel');
            const now = new Date();
            const poolCards = await Card.find({
                _id: { $in: templatePack.cardPool },
                $and: [
                    {
                        $or: [
                            { availableFrom: null },
                            { availableFrom: { $lte: now } }
                        ]
                    },
                    {
                        $or: [
                            { availableTo: null },
                            { availableTo: { $gte: now } }
                        ]
                    }
                ]
            }).select('_id').lean();

            const filteredIds = poolCards.map(card => card._id.toString());
            if (filteredIds.length === 0) {
                return res.status(400).json({ message: 'Selected pack template has no cards currently available.' });
            }

            pack = await generatePackPreviewFromPool(filteredIds, 5, forceModifier);
        } else {
            pack = await generatePackPreview(5, forceModifier);
        }

        const duration = Date.now() - start;
        console.log('[debugOpenPackForUser] generated pack in', duration, 'ms');
        res.status(200).json({ message: 'Debug pack generated', newCards: pack });
    } catch (error) {
        await createLogEntry(req.user, 'ERROR_PACK_GENERATION', error.message);
        console.error('[debugOpenPackForUser] Error:', error.message);
        res.status(500).json({ message: 'Failed to generate debug pack' });
    }
};

const getMyPacks = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('packs');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ packs: user.packs });
    } catch (error) {
        console.error('[getMyPacks] Error:', error);
        res.status(500).json({ message: 'Failed to fetch user packs' });
    }
};

const openPackById = async (req, res) => {
    try {
        const { packId } = req.params;
        const pack = await Pack.findById(packId);
        if (!pack) {
            return res.status(404).json({ message: 'Pack not found' });
        }

        let cards = [];
        if (pack.cardPool && pack.cardPool.length > 0) {
            const Card = require('../models/cardModel');
            const now = new Date();
            const poolCards = await Card.find({
                _id: { $in: pack.cardPool },
                $and: [
                    {
                        $or: [
                            { availableFrom: null },
                            { availableFrom: { $lte: now } }
                        ]
                    },
                    {
                        $or: [
                            { availableTo: null },
                            { availableTo: { $gte: now } }
                        ]
                    }
                ]
            });

            for (let i = 0; i < 5; i++) {
                if (poolCards.length === 0) break;
                const randomIndex = Math.floor(Math.random() * poolCards.length);
                const cardDoc = poolCards[randomIndex];
                const rarityObj = cardDoc.rarities[0];
                cards.push({
                    name: cardDoc.name,
                    imageUrl: cardDoc.imageUrl,
                    flavorText: cardDoc.flavorText,
                    rarity: rarityObj.rarity,
                    mintNumber: 0,
                });
            }
        } else {
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
    debugOpenPackForUser,
    getMyPacks,
    openPackById,
};
