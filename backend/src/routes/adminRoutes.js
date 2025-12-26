const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const ftp = require('basic-ftp');
const path = require('path');
const { Readable } = require('stream');
const UserActivity = require('../models/UserActivity');
const { grantCardReward, grantPackReward, grantXpReward} = require('../helpers/eventHelpers');
const { handleMonthlyPayout } = require('../services/payoutService');

const User = require('../models/userModel');
const Card = require('../models/cardModel');
const Pack = require('../models/packModel');
const Notification = require('../models/notificationModel');
const Achievement = require('../models/achievementModel');
const Title = require('../models/titleModel');
const Modifier = require('../models/modifierModel');
const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const EventClaim = require('../models/eventClaimModel');
const Setting = require('../models/settingsModel');
const PeriodCounter = require('../models/periodCounterModel');

const { protect } = require('../middleware/authMiddleware');
const { broadcastNotification, sendNotificationToUser} = require('../../notificationService');
const {getStatus, forceResume, resumeQueue, pauseQueue} = require("../services/queueService");
const {updateCard} = require("../controllers/adminController");
const { getWeeklyKey } = require('../scripts/periods');

const tradeController = require('../controllers/tradeController');
const {createNotification} = require("../helpers/notificationHelper");
const {createLogEntry} = require("../utils/logService");

const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

const MODIFIER_NAME_TO_PREFIX_MAP = {
    "Glitch": "Glitched ",
    "Negative": "Negative ",
    "Prismatic": "Prismatic "
};

const stripCardNameModifiers = (cardName) => {
    if (typeof cardName !== 'string') return cardName;
    const PREFIXES_TO_STRIP = Object.values(MODIFIER_NAME_TO_PREFIX_MAP);
    for (const modifier of PREFIXES_TO_STRIP) {
        if (cardName.startsWith(modifier)) {
            return cardName.substring(modifier.length);
        }
    }
    return cardName;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildCardNameRegex = (name) => {
    const prefixes = Object.values(MODIFIER_NAME_TO_PREFIX_MAP).map(escapeRegex);
    const prefixPattern = prefixes.length ? `(?:${prefixes.join('|')})` : '';
    const base = escapeRegex(name);
    const pattern = prefixPattern ? `^(?:${prefixPattern})?${base}$` : `^${base}$`;
    return new RegExp(pattern, 'i');
};

const normalizeGameTags = (value) => {
    if (!value) return [];
    const list = Array.isArray(value) ? value : String(value).split(',');
    const cleaned = list
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.length > 0);
    return Array.from(new Set(cleaned));
};

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

const TITLE_SELECT = 'name slug description color gradient isAnimated effect';

router.post('/clear-cards', protect, adminOnly, async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: 'User ID is required to clear cards.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
        user.cards = [];
        await user.save();
        res.json({ message: 'All cards removed successfully.' });
    } catch (error) {
        console.error('Error clearing cards:', error);
        res.status(500).json({ error: 'Failed to clear cards.' });
    }
});

router.post('/set-packs', protect, adminOnly, async (req, res) => {
    try {
        const result = await User.updateMany({}, { packs: 6 });
        res.json({ message: 'All users now have 6 packs.', updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating pack count for all users:', error);
        res.status(500).json({ error: 'Failed to update packs for all users.' });
    }
});

router.post('/add-packs', protect, adminOnly, async (req, res) => {
    const { amount } = req.body;
    const num = Number(amount);
    if (isNaN(num)) {
        return res.status(400).json({ error: 'Amount must be a number.' });
    }
    try {
        const result = await User.updateMany({}, { $inc: { packs: num } });
        res.json({ message: `Added ${num} packs to all users.`, updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error adding packs to all users:', error);
        res.status(500).json({ error: 'Failed to add packs to all users.' });
    }
});

router.post('/add-packs-active', protect, adminOnly, async (req, res) => {
    const { amount } = req.body;
    const num = Number(amount);

    if (isNaN(num)) {
        return res.status(400).json({ error: 'Amount must be a number.' });
    }

    try {
        const activeMinutes = 30;
        const cutoffDate = new Date(Date.now() - activeMinutes * 60 * 1000);

        const activeActivities = await UserActivity.find({
            lastActive: { $gte: cutoffDate }
        }).select('userId');

        const activeUserIds = activeActivities.map(activity => activity.userId);

        if (activeUserIds.length === 0) {
            return res.json({ message: 'No active users found to give packs to.', updatedCount: 0 });
        }

        const result = await User.updateMany(
            { _id: { $in: activeUserIds } },
            { $inc: { packs: num } }
        );

        res.json({ message: `Added ${num} packs to ${result.modifiedCount} active users.`, updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error adding packs to active users:', error);
        res.status(500).json({ error: 'Failed to add packs to active users.' });
    }
});

router.post('/give-packs', protect, adminOnly, async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || typeof amount !== 'number') {
        return res.status(400).json({ error: 'User ID and pack amount required.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found.' });
        user.packs = (user.packs || 0) + amount;
        await user.save();
        res.json({ message: `Added ${amount} packs to ${user.username}.` });
    } catch {
        res.status(500).json({ error: 'Failed to give packs.' });
    }
});

router.get('/users', protect, adminOnly, async (req, res) => {
    const start = process.hrtime();
    try {
        const dbStart = process.hrtime();
        const users = await User.find({}, 'username packs preferredPack selectedTitle')
            .populate('preferredPack', 'name')
            .populate('selectedTitle', TITLE_SELECT)
            .lean();
        const dbEnd = process.hrtime(dbStart);
        console.log(`[PERF] [admin/users] DB query took ${dbEnd[0] * 1000 + dbEnd[1] / 1e6} ms`);
        const total = process.hrtime(start);
        console.log(`[PERF] [admin/users] TOTAL: ${total[0] * 1000 + total[1] / 1e6} ms`);
        res.json(users);
    } catch (err) {
        const total = process.hrtime(start);
        console.error(`[PERF] [admin/users] ERROR after ${total[0] * 1000 + total[1] / 1e6} ms:`, err);
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

router.get('/users-activity', protect, adminOnly, async (req, res) => {
    try {
        const { activeMinutes } = req.query;
        const activeMinutesNum = parseInt(activeMinutes) || 15;

        const pipeline = [
            {
                $lookup: {
                    from: 'useractivities',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'activityInfo'
                }
            },
            {
                $unwind: {
                    path: '$activityInfo',
                    preserveNullAndEmptyArrays: true
                }
            }
        ];

        if (activeMinutes) {
            const cutoff = new Date(Date.now() - activeMinutesNum * 60 * 1000);
            pipeline.push({
                $match: {
                    'activityInfo.lastActive': { $gte: cutoff }
                }
            });
        }

        pipeline.push({
            $sort: {
                'activityInfo.lastActive': -1
            }
        });

        pipeline.push({
            $project: {
                _id: 1,
                username: 1,
                packs: 1,
                preferredPack: 1,
                selectedTitle: 1,
                twitchProfilePic: 1,
                lastActive: '$activityInfo.lastActive'
            }
        });

        const users = await User.aggregate(pipeline);

        await User.populate(users, [
            { path: 'preferredPack', select: 'name' },
            { path: 'selectedTitle', select: TITLE_SELECT }
        ]);

        res.json(users);
    } catch (err) {
        console.error('Error fetching users with activity:', err);
        res.status(500).json({ error: 'Failed to fetch users with activity.' });
    }
});

router.get('/trades', protect, adminOnly, async (req, res) => {
    try {
        const trades = await Trade.find({})
            .sort({ createdAt: -1 })
            .populate({
                path: 'sender',
                select: 'username selectedTitle',
                populate: { path: 'selectedTitle', select: TITLE_SELECT }
            })
            .populate({
                path: 'recipient',
                select: 'username selectedTitle',
                populate: { path: 'selectedTitle', select: TITLE_SELECT }
            })
            .lean();

        res.json(trades);

    } catch (err) {
        console.error('Error fetching trades for admin panel:', err);
        res.status(500).json({ message: 'Server Error' });
    }
});

const handleAdminTradeAction = (action) => {
    return (req, res, next) => {
        req.body.status = action;
        req.userId = req.user._id;
        tradeController.updateTradeStatus(req, res, next);
    };
};

router.post('/trades/:tradeId/accept', protect, adminOnly, handleAdminTradeAction('accepted'));
router.post('/trades/:tradeId/cancel', protect, adminOnly, handleAdminTradeAction('cancelled'));
router.post('/trades/:tradeId/reject', protect, adminOnly, handleAdminTradeAction('rejected'));

router.post('/notifications', protect, adminOnly, async (req, res) => {
    const { type, message, link = "", userId } = req.body;

    if (!type || !message) {
        return res.status(400).json({ message: 'Type and message are required.' });
    }

    try {
        if (userId) {
            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            const newNotification = await Notification.create({
                userId,
                type,
                message,
                link,
                isRead: false,
                createdAt: new Date(),
                extra: {}
            });

            const io = req.io;
            io.to(userId.toString()).emit('notification', newNotification);

            console.log(`[AdminRoutes] Sent notification to user: ${userId}`);
            res.status(200).json({ message: `Notification sent to ${user.username} successfully.` });

        } else {
            const notificationPayload = {
                type,
                message,
                link,
                extra: {},
                isRead: false,
                createdAt: new Date()
            };

            console.log("[AdminRoutes] Broadcasting notification:", notificationPayload);

            const users = await User.find({}, '_id').lean();
            const docs = users.map(u => ({ ...notificationPayload, userId: u._id }));

            if (docs.length > 0) {
                await Notification.insertMany(docs);
            }

            broadcastNotification(notificationPayload);

            res.status(200).json({ message: 'Notification broadcast successfully.' });
        }
    } catch (error) {
        console.error('Error sending notification:', error.message);
        res.status(500).json({ message: 'Error sending notification.' });
    }
});

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname, '../../public/uploads/cards'));
    },
    filename: function(req, file, cb) {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

router.post('/cards', protect, adminOnly, async (req, res) => {
    try {
        const { name, flavorText, imageUrl, lore, loreAuthor, availableFrom, availableTo, rarities, isHidden, gameTags } = req.body;

        const newCard = new Card({
            name,
            flavorText,
            imageUrl,
            lore,
            loreAuthor,
            availableFrom: availableFrom ? new Date(availableFrom) : null,
            availableTo: availableTo ? new Date(availableTo) : null,
            rarities: rarities || [],
            isHidden: isHidden || false,
            gameTags: normalizeGameTags(gameTags),
        });

        await newCard.save();
        res.json({ message: 'Card created successfully', card: newCard });
    } catch (error) {
        console.error('Error creating card:', error);
        res.status(500).json({ message: 'Failed to create card' });
    }
});

router.post('/cards/backfill-hidden-field', protect, adminOnly, async (req, res) => {
    const { dryRun } = req.body;

    try {
        const query = { isHidden: { $exists: false } };

        if (dryRun) {
            const count = await Card.countDocuments(query);
            return res.json({
                isDryRun: true,
                message: `Dry Run: Found ${count} card(s) that need the 'isHidden' field added.`,
                cardsToUpdate: count,
            });
        }

        const updateResult = await Card.updateMany(
            query,
            { $set: { isHidden: false } }
        );

        res.json({
            isDryRun: false,
            message: `Successfully updated ${updateResult.modifiedCount} card(s).`,
            updatedCount: updateResult.modifiedCount,
        });

    } catch (error) {
        console.error('Error backfilling isHidden field:', error);
        res.status(500).json({ message: 'Server error during backfill process.' });
    }
});

router.post('/cards/bulk-tags', protect, adminOnly, async (req, res) => {
    try {
        const { cardIds, addTags, removeTags } = req.body || {};
        if (!Array.isArray(cardIds) || cardIds.length === 0) {
            return res.status(400).json({ message: 'cardIds must be a non-empty array.' });
        }

        const tagsToAdd = normalizeGameTags(addTags);
        const tagsToRemove = normalizeGameTags(removeTags);
        if (tagsToAdd.length === 0 && tagsToRemove.length === 0) {
            return res.status(400).json({ message: 'Provide addTags and/or removeTags.' });
        }

        const cards = await Card.find({ _id: { $in: cardIds } })
            .select('name gameTags')
            .lean();
        if (cards.length === 0) {
            return res.status(404).json({ message: 'No cards found for the provided cardIds.' });
        }

        const normalizeKey = (tag) => String(tag).trim().toLowerCase();
        const buildTagMap = (tags) => {
            const map = new Map();
            (tags || []).forEach((tag) => {
                const trimmed = String(tag).trim();
                if (!trimmed) return;
                const key = normalizeKey(trimmed);
                if (!map.has(key)) {
                    map.set(key, trimmed);
                }
            });
            return map;
        };

        const addMap = buildTagMap(tagsToAdd);
        const removeKeys = new Set(tagsToRemove.map(normalizeKey));
        const updatedCards = [];
        const bulkOps = [];

        cards.forEach((card) => {
            const tagMap = buildTagMap(card.gameTags);
            addMap.forEach((value, key) => {
                if (!removeKeys.has(key)) {
                    tagMap.set(key, value);
                }
            });
            removeKeys.forEach((key) => tagMap.delete(key));
            const updatedTags = Array.from(tagMap.values());

            bulkOps.push({
                updateOne: {
                    filter: { _id: card._id },
                    update: { $set: { gameTags: updatedTags } },
                },
            });
            updatedCards.push({ _id: card._id.toString(), name: card.name, gameTags: updatedTags });
        });

        if (bulkOps.length > 0) {
            await Card.bulkWrite(bulkOps);
        }

        const updateUserCardTags = async (cardName, updatedTags) => {
            const regex = buildCardNameRegex(cardName);
            const arrays = ['cards', 'featuredCards', 'openedCards'];
            await Promise.all(
                arrays.map((arrayName) =>
                    User.updateMany(
                        { [`${arrayName}.name`]: { $regex: regex } },
                        { $set: { [`${arrayName}.$[elem].gameTags`]: updatedTags } },
                        { arrayFilters: [{ 'elem.name': { $regex: regex } }] }
                    )
                )
            );
        };

        await Promise.all(
            updatedCards.map((card) => updateUserCardTags(card.name, card.gameTags))
        );

        return res.json({
            message: 'Tags updated successfully.',
            updatedCount: updatedCards.length,
            tagsAdded: tagsToAdd,
            tagsRemoved: tagsToRemove,
            updatedCards,
        });
    } catch (error) {
        console.error('Error bulk updating card tags:', error);
        res.status(500).json({ message: 'Failed to bulk update card tags.' });
    }
});


router.get('/cards', async (req, res) => {
    try {
        const cards = await Card.find();
        const grouped = {};
        cards.forEach(card => {
            if (Array.isArray(card.rarities)) {
                card.rarities.forEach(rarityObj => {
                    const rarity = rarityObj.rarity;
                    if (!grouped[rarity]) {
                        grouped[rarity] = [];
                    }
                    grouped[rarity].push(card);
                });
            }
        });
        res.json({ groupedCards: grouped });
    } catch (error) {
        console.error('Error fetching cards:', error);
        res.status(500).json({ message: 'Failed to fetch cards' });
    }
});

router.put('/cards/:cardId', protect, adminOnly, updateCard);

router.delete('/cards/:cardId', protect, adminOnly, async (req, res) => {
    try {
        const card = await Card.findById(req.params.cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }
        await card.deleteOne();
        res.json({ message: 'Card deleted successfully' });
    } catch (error) {
        console.error('Error deleting card:', error);
        res.status(500).json({ message: 'Failed to delete card' });
    }
});

router.post('/grant-card', protect, adminOnly, async (req, res) => {
    const { userId, cardId, rarity, mintNumber } = req.body;
    if (!userId || !cardId || !rarity || mintNumber == null) {
        return res.status(400).json({ message: 'userId, cardId, rarity, and mintNumber are required.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const cardDoc = await Card.findById(cardId);
        if (!cardDoc) return res.status(404).json({ message: 'Card not found' });

        const rarityObj = cardDoc.rarities.find(r => r.rarity === rarity);
        if (!rarityObj) return res.status(400).json({ message: 'Invalid rarity for this card' });

        if (!rarityObj.availableMintNumbers.includes(mintNumber)) {
            return res.status(400).json({ message: 'Mint number not available' });
        }

        rarityObj.availableMintNumbers = rarityObj.availableMintNumbers.filter(n => n !== mintNumber);
        rarityObj.remainingCopies -= 1;
        await cardDoc.save();

          user.cards.push({
              name: cardDoc.name,
              imageUrl: cardDoc.imageUrl,
              flavorText: cardDoc.flavorText,
              rarity,
              mintNumber,
              acquiredAt: new Date(),
              status: 'available',
              gameTags: Array.isArray(cardDoc.gameTags) ? cardDoc.gameTags : [],
          });
        await user.save();

        res.json({ message: 'Card granted successfully' });
    } catch (error) {
        console.error('Error granting card:', error);
        res.status(500).json({ message: 'Failed to grant card' });
    }
});

router.post('/update-card-availability', protect, adminOnly, async (req, res) => {
    const { cardId, availableFrom, availableTo, series } = req.body;
    if (!cardId) {
        return res.status(400).json({ message: 'cardId is required.' });
    }
    try {
        const card = await Card.findById(cardId);
        if (!card) return res.status(404).json({ message: 'Card not found' });

        if (availableFrom !== undefined) card.availableFrom = availableFrom ? new Date(availableFrom) : null;
        if (availableTo !== undefined) card.availableTo = availableTo ? new Date(availableTo) : null;
        if (series !== undefined) card.series = series;

        await card.save();
        res.json({ message: 'Card availability updated successfully' });
    } catch (error) {
        console.error('Error updating card availability:', error);
        res.status(500).json({ message: 'Failed to update card availability' });
    }
});

router.post('/upsert-pack', protect, adminOnly, async (req, res) => {
    const { packId, name, cardPool, animationUrl } = req.body;
    try {
        let pack;
        if (packId) {
            pack = await Pack.findById(packId);
            if (!pack) return res.status(404).json({ message: 'Pack not found' });
        } else {
            pack = new Pack({ userId: null, isOpened: false, cards: [] });
        }

        if (name !== undefined) pack.name = name;
        if (cardPool !== undefined) pack.cardPool = cardPool;
        if (animationUrl !== undefined) pack.animationUrl = animationUrl;

        await pack.save();
        res.json({ message: 'Pack saved successfully', pack });
    } catch (error) {
        console.error('Error saving pack:', error);
        res.status(500).json({ message: 'Failed to save pack' });
    }
});

router.get('/packs', async (req, res) => {
    try {
        const packs = await Pack.find();
        res.json({ packs });
    } catch (error) {
        console.error('Error fetching packs:', error);
        res.status(500).json({ message: 'Failed to fetch packs' });
    }
});

router.delete('/packs/:packId', protect, adminOnly, async (req, res) => {
    try {
        const pack = await Pack.findById(req.params.packId);
        if (!pack) {
            return res.status(404).json({ message: 'Pack not found' });
        }
        await pack.deleteOne();
        res.json({ message: 'Pack deleted successfully' });
    } catch (error) {
        console.error('Error deleting pack:', error);
        res.status(500).json({ message: 'Failed to delete pack' });
    }
});

router.post('/grant-pack', protect, adminOnly, async (req, res) => {
    const { userId, packId } = req.body;
    if (!userId || !packId) {
        return res.status(400).json({ message: 'userId and packId are required.' });
    }
    try {
        const pack = await Pack.findById(packId);
        if (!pack) return res.status(404).json({ message: 'Pack not found' });

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const userPack = new Pack({
            userId: user._id,
            isOpened: false,
            type: pack.type,
            series: pack.series,
            availableFrom: pack.availableFrom,
            availableTo: pack.availableTo,
            cardPool: pack.cardPool,
            cards: [],
        });
        await userPack.save();

        res.json({ message: 'Pack granted to user successfully' });
    } catch (error) {
        console.error('Error granting pack:', error);
        res.status(500).json({ message: 'Failed to grant pack' });
    }
});


router.get('/achievements', protect, adminOnly, async (req, res) => {
    try {
        const achievements = await Achievement.find();
        res.json({ achievements });
    } catch (err) {
        console.error('Error fetching achievements:', err);
        res.status(500).json({ message: 'Failed to fetch achievements' });
    }
});

router.post('/achievements', protect, adminOnly, async (req, res) => {
    try {
        const { name, description, threshold, packs, card } = req.body;
        const achievement = new Achievement({
            name,
            description,
            threshold: Number(threshold) || 0,
            packs: Number(packs) || 0,
            card: card || null,
        });
        await achievement.save();
        res.json({ achievement });
    } catch (err) {
        console.error('Error creating achievement:', err);
        res.status(500).json({ message: 'Failed to create achievement' });
    }
});

router.put('/achievements/:id', protect, adminOnly, async (req, res) => {
    try {
        const achievement = await Achievement.findById(req.params.id);
        if (!achievement) return res.status(404).json({ message: 'Achievement not found' });

        const { name, description, threshold, packs, card } = req.body;
        achievement.name = name;
        achievement.description = description;
        achievement.threshold = Number(threshold) || 0;
        achievement.packs = Number(packs) || 0;
        achievement.card = card || null;

        await achievement.save();
        res.json({ achievement });
    } catch (err) {
        console.error('Error updating achievement:', err);
        res.status(500).json({ message: 'Failed to update achievement' });
    }
});

router.delete('/achievements/:id', protect, adminOnly, async (req, res) => {
    try {
        const deleted = await Achievement.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Achievement not found' });
        res.json({ message: 'Achievement deleted' });
    } catch (err) {
        console.error('Error deleting achievement:', err);
        res.status(500).json({ message: 'Failed to delete achievement' });
    }
});

router.get('/titles', protect, adminOnly, async (req, res) => {
    try {
        const titles = await Title.find().select(TITLE_SELECT).sort({ createdAt: -1 }).lean();
        res.json({ titles });
    } catch (err) {
        console.error('Error fetching titles:', err);
        res.status(500).json({ message: 'Failed to fetch titles' });
    }
});

router.post('/titles', protect, adminOnly, async (req, res) => {
    try {
        const { name, slug, description, color, gradient, isAnimated, effect } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Title name is required' });
        }

        const resolvedSlug = slugify(slug || name);
        if (!resolvedSlug) {
            return res.status(400).json({ message: 'Title slug is invalid' });
        }

        const existing = await Title.findOne({ slug: resolvedSlug });
        if (existing) {
            return res.status(400).json({ message: 'Title slug already exists' });
        }

        const title = await Title.create({
            name,
            slug: resolvedSlug,
            description: description || '',
            color: color || '',
            gradient: gradient || '',
            isAnimated: Boolean(isAnimated),
            effect: effect || ''
        });

        res.json({ title });
    } catch (err) {
        console.error('Error creating title:', err);
        res.status(500).json({ message: 'Failed to create title' });
    }
});

router.put('/titles/:id', protect, adminOnly, async (req, res) => {
    try {
        const { name, slug, description, color, gradient, isAnimated, effect } = req.body;
        const title = await Title.findById(req.params.id);
        if (!title) {
            return res.status(404).json({ message: 'Title not found' });
        }

        if (name !== undefined) {
            title.name = name;
        }
        if (slug !== undefined || name !== undefined) {
            const resolvedSlug = slugify(slug || title.name);
            if (!resolvedSlug) {
                return res.status(400).json({ message: 'Title slug is invalid' });
            }
            const existing = await Title.findOne({ slug: resolvedSlug, _id: { $ne: title._id } });
            if (existing) {
                return res.status(400).json({ message: 'Title slug already exists' });
            }
            title.slug = resolvedSlug;
        }
        if (description !== undefined) {
            title.description = description;
        }
        if (color !== undefined) {
            title.color = color;
        }
        if (gradient !== undefined) {
            title.gradient = gradient;
        }
        if (isAnimated !== undefined) {
            title.isAnimated = Boolean(isAnimated);
        }
        if (effect !== undefined) {
            title.effect = effect;
        }

        await title.save();
        res.json({ title });
    } catch (err) {
        console.error('Error updating title:', err);
        res.status(500).json({ message: 'Failed to update title' });
    }
});

router.delete('/titles/:id', protect, adminOnly, async (req, res) => {
    try {
        const title = await Title.findById(req.params.id);
        if (!title) {
            return res.status(404).json({ message: 'Title not found' });
        }

        await Promise.all([
            User.updateMany({ selectedTitle: title._id }, { $set: { selectedTitle: null } }),
            User.updateMany({ unlockedTitles: title._id }, { $pull: { unlockedTitles: title._id } }),
            title.deleteOne()
        ]);

        res.json({ message: 'Title deleted' });
    } catch (err) {
        console.error('Error deleting title:', err);
        res.status(500).json({ message: 'Failed to delete title' });
    }
});

router.post('/titles/grant', protect, adminOnly, async (req, res) => {
    try {
        const { userId, titleId, setActive } = req.body;
        if (!userId || !titleId) {
            return res.status(400).json({ message: 'userId and titleId are required' });
        }

        const [user, title] = await Promise.all([
            User.findById(userId),
            Title.findById(titleId)
        ]);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (!title) {
            return res.status(404).json({ message: 'Title not found' });
        }

        const update = { $addToSet: { unlockedTitles: title._id } };
        if (setActive) {
            update.$set = { selectedTitle: title._id };
        }

        await User.updateOne({ _id: user._id }, update);

        res.json({ message: `Granted title to ${user.username}` });
    } catch (err) {
        console.error('Error granting title:', err);
        res.status(500).json({ message: 'Failed to grant title' });
    }
});

router.post('/titles/revoke', protect, adminOnly, async (req, res) => {
    try {
        const { userId, titleId } = req.body;
        if (!userId || !titleId) {
            return res.status(400).json({ message: 'userId and titleId are required' });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const updates = {
            $pull: { unlockedTitles: titleId }
        };
        if (user.selectedTitle && user.selectedTitle.toString() === titleId) {
            updates.$set = { selectedTitle: null };
        }

        await User.updateOne({ _id: user._id }, updates);

        res.json({ message: `Revoked title from ${user.username}` });
    } catch (err) {
        console.error('Error revoking title:', err);
        res.status(500).json({ message: 'Failed to revoke title' });
    }
});


router.get('/audit-cards', protect, adminOnly, async (req, res) => {
    const auditResults = {
        status: "success",
        message: "Card audit completed.",
        timestamp: new Date().toISOString(),
        summary: {},
        details: {
            malformedUserCards: [],
            missingParentCardDefinitions: [],
            missingRarityDefinitions: [],
            duplicateMintNumbersInCardDef: [],
            userCardsToReroll: [],
            noMintNumbersLeftForReroll: [],
            trueDuplicateCardInstancesAcrossUsers: [],
            cardDataMismatches: [],
            mint0Cards: [],
            missingModifierPrefixIssues: [],
            legacyGlitchNameIssues: [],
        }
    };

    if (mongoose.connection.readyState !== 1) {
        auditResults.status = "error";
        auditResults.message = "Database not connected.";
        return res.status(500).json(auditResults);
    }

    try {
        const allModifiers = await Modifier.find({}).lean();
        const modifierIdToNameMap = new Map();
        allModifiers.forEach(mod => {
            modifierIdToNameMap.set(mod._id.toString(), mod.name);
        });

        const allCards = await Card.find({}).lean();
        const cardDefinitionMap = new Map();
        const cardIdByNameRarityMap = new Map();

        allCards.forEach(card => {
            const raritiesMap = new Map();
            card.rarities.forEach(r => {
                raritiesMap.set(r.rarity.toLowerCase(), r);
                const key = `${card.name}|${r.rarity.toLowerCase()}`;
                cardIdByNameRarityMap.set(key, card._id.toString());
            });
            cardDefinitionMap.set(card._id.toString(), { baseCard: card, raritiesMap });
        });

        const users = await User.find({ 'cards.mintNumber': { '$exists': true } }).select('_id username cards').lean();

        const totalUsersScanned = users.length;
        let totalCardsScanned = 0;
        const globalAssignedMintsTracker = new Map();

        for (const user of users) {
            totalCardsScanned += user.cards.length;

            let cardIndex = -1;
            for (const userCard of user.cards) {
                cardIndex++;

                if (!userCard.name || !userCard.rarity || typeof userCard.mintNumber !== 'number') {
                    auditResults.details.malformedUserCards.push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, issue: "Malformed card data" });
                    continue;
                }

                if (userCard.mintNumber === 0) {
                    auditResults.details.mint0Cards.push({ userId: user._id, username: user.username, userCard });
                }

                const userCardName = String(userCard.name);

                const cleanedCardName = stripCardNameModifiers(userCardName);

                if (userCardName.startsWith("Glitch ")) {
                    auditResults.details.legacyGlitchNameIssues.push({
                        userId: user._id,
                        username: user.username,
                        userCard,
                        originalName: userCardName,
                        suggestedName: "Glitched " + userCardName.substring("Glitch ".length)
                    });
                }

                if (userCard.modifier) {
                    const modifierId = userCard.modifier.toString();
                    const modifierName = modifierIdToNameMap.get(modifierId);

                    if (modifierName) {
                        const expectedPrefix = MODIFIER_NAME_TO_PREFIX_MAP[modifierName];
                        if (expectedPrefix && !userCardName.startsWith(expectedPrefix)) {
                            auditResults.details.missingModifierPrefixIssues.push({
                                userId: user._id,
                                username: user.username,
                                userCard,
                                originalName: userCardName,
                                suggestedName: expectedPrefix + userCardName,
                                missingPrefix: expectedPrefix.trim()
                            });
                        }
                    }
                }

                const userCardRarityLower = String(userCard.rarity).toLowerCase();
                const userCardMintNumber = userCard.mintNumber;
                const acquiredAt = userCard.acquiredAt;

                const uniqueCardInstanceKey = `${userCardName}|${userCardRarityLower}|${userCardMintNumber}`;
                if (!globalAssignedMintsTracker.has(uniqueCardInstanceKey)) {
                    globalAssignedMintsTracker.set(uniqueCardInstanceKey, []);
                }
                globalAssignedMintsTracker.get(uniqueCardInstanceKey).push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, acquiredAt });

                const parentCardId = cardIdByNameRarityMap.get(`${cleanedCardName}|${userCardRarityLower}`);

                if (!parentCardId) {
                    auditResults.details.missingParentCardDefinitions.push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, cleanedCardName: cleanedCardName, issue: "No matching parent card definition found" });
                    continue;
                }

                const parentDef = cardDefinitionMap.get(parentCardId);
                const rarityDefinition = parentDef?.raritiesMap.get(userCardRarityLower);

                if (parentDef) {
                    const mismatches = [];
                    if (userCard.imageUrl !== parentDef.baseCard.imageUrl) mismatches.push({ field: 'imageUrl', userValue: userCard.imageUrl, baseValue: parentDef.baseCard.imageUrl });
                    if (userCard.flavorText !== parentDef.baseCard.flavorText) mismatches.push({ field: 'flavorText', userValue: userCard.flavorText, baseValue: parentDef.baseCard.flavorText });
                    if (mismatches.length > 0) {
                        auditResults.details.cardDataMismatches.push({ userId: user._id, username: user.username, userCard, mismatches });
                    }
                }

                if (!rarityDefinition) {
                    auditResults.details.missingRarityDefinitions.push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, cleanedCardName: cleanedCardName, parentCardId, issue: "No matching rarity definition found in parent" });
                    continue;
                }

                const availableMintsInCardDef = Array.isArray(rarityDefinition.availableMintNumbers) ? rarityDefinition.availableMintNumbers : [];

                if (availableMintsInCardDef.includes(userCardMintNumber)) {
                    auditResults.details.duplicateMintNumbersInCardDef.push({ userId: user._id, username: user.username, cardIndex, cardName: userCardName, cleanedCardName, rarity: userCardRarityLower, mintNumber: userCardMintNumber, parentCardId });
                    const potentialNewMints = availableMintsInCardDef.filter(mint => mint !== userCardMintNumber);
                    if (potentialNewMints.length > 0) {
                        const suggestedNewMintNumber = potentialNewMints[Math.floor(Math.random() * potentialNewMints.length)];
                        auditResults.details.userCardsToReroll.push({ userId: user._id, username: user.username, cardIndex, cardName: userCardName, cleanedCardName, rarity: userCardRarityLower, oldMintNumber: userCardMintNumber, suggestedNewMintNumber, parentCardId, issue: "Mint number in use but marked as available" });
                    } else {
                        auditResults.details.noMintNumbersLeftForReroll.push({ userId: user._id, username: user.username, cardIndex, cardName: userCardName, cleanedCardName, rarity: userCardRarityLower, mintNumber: userCardMintNumber, parentCardId, issue: "Inconsistency found but no other mints available for reroll" });
                    }
                }
            }
        }

        for (const [uniqueCardInstanceKey, owners] of globalAssignedMintsTracker.entries()) {
            if (owners.length > 1) {
                owners.sort((a, b) => (a.acquiredAt ? new Date(a.acquiredAt).getTime() : Infinity) - (b.acquiredAt ? new Date(b.acquiredAt).getTime() : Infinity));
                if (owners.length > 0) owners[0].isFirstOwner = true;
                auditResults.details.trueDuplicateCardInstancesAcrossUsers.push({ cardInstance: uniqueCardInstanceKey, owners: owners.map(o => ({ userId: o.userId, username: o.username, cardIndex: o.cardIndex, acquiredAt: o.acquiredAt, isFirstOwner: o.isFirstOwner || false })) });
            }
        }

        auditResults.summary = {
            totalUsersScanned,
            totalCardsScanned,
            malformedUserCardsCount: auditResults.details.malformedUserCards.length,
            missingParentCardDefinitionsCount: auditResults.details.missingParentCardDefinitions.length,
            missingRarityDefinitionsCount: auditResults.details.missingRarityDefinitions.length,
            inconsistenciesWithCardDefCount: auditResults.details.duplicateMintNumbersInCardDef.length,
            suggestedRerollsCount: auditResults.details.userCardsToReroll.length,
            noRerollPossibleCount: auditResults.details.noMintNumbersLeftForReroll.length,
            trueDuplicateCardInstancesAcrossUsersCount: auditResults.details.trueDuplicateCardInstancesAcrossUsers.length,
            cardDataMismatchesCount: auditResults.details.cardDataMismatches.length,
            mint0CardsCount: auditResults.details.mint0Cards.length,
            missingModifierPrefixIssuesCount: auditResults.details.missingModifierPrefixIssues.length,
            legacyGlitchNameIssuesCount: auditResults.details.legacyGlitchNameIssues.length,
        };

        return res.status(200).json(auditResults);

    } catch (error) {
        auditResults.status = "error";
        auditResults.message = "An unhandled error occurred during the card audit: " + error.message;
        console.error("Error in /audit-cards:", error);
        return res.status(500).json(auditResults);
    }
});

router.post('/trades/backfill-snapshots', protect, adminOnly, async (req, res) => {
    const { dryRun } = req.body;

    try {
        const legacyTrades = await Trade.find({
            $or: [
                { 'offeredItemsSnapshot': { $exists: false } },
                { 'offeredItemsSnapshot': { $size: 0 } }
            ]
        }).lean();

        if (legacyTrades.length === 0) {
            return res.json({
                isDryRun: dryRun,
                message: 'No legacy trades found that require snapshot backfill.',
                tradesToUpdate: 0,
                updatedCount: 0
            });
        }

        console.log('Building card map...');
        const cardMap = new Map();
        const usersWithCards = await User.find({ 'cards.0': { $exists: true } }).select('cards').lean();
        for (const user of usersWithCards) {
            for (const card of user.cards) {
                cardMap.set(card._id.toString(), card);
            }
        }
        console.log(`Card map built with ${cardMap.size} unique cards.`);

        const bulkOps = [];
        let tradesFound = 0;

        for (const trade of legacyTrades) {
            const offeredItemsSnapshot = trade.offeredItems.map(id => cardMap.get(id.toString())).filter(Boolean);
            const requestedItemsSnapshot = trade.requestedItems.map(id => cardMap.get(id.toString())).filter(Boolean);

            if (offeredItemsSnapshot.length === trade.offeredItems.length && requestedItemsSnapshot.length === trade.requestedItems.length) {
                tradesFound++;
                bulkOps.push({
                    updateOne: {
                        filter: { _id: trade._id },
                        update: {
                            $set: {
                                offeredItemsSnapshot: offeredItemsSnapshot.map(c => ({ originalId: c._id, name: c.name, rarity: c.rarity, mintNumber: c.mintNumber, imageUrl: c.imageUrl })),
                                requestedItemsSnapshot: requestedItemsSnapshot.map(c => ({ originalId: c._id, name: c.name, rarity: c.rarity, mintNumber: c.mintNumber, imageUrl: c.imageUrl }))
                            }
                        }
                    }
                });
            }
        }

        if (dryRun) {
            return res.json({
                isDryRun: true,
                message: `Dry Run: Found ${tradesFound} legacy trades that can be updated with snapshot data.`,
                tradesToUpdate: tradesFound,
                updatedCount: 0
            });
        }

        if (bulkOps.length === 0) {
            return res.json({
                isDryRun: false,
                message: 'No trades were updated.',
                tradesToUpdate: tradesFound,
                updatedCount: 0
            });
        }

        const result = await Trade.bulkWrite(bulkOps);

        res.json({
            isDryRun: false,
            message: `Successfully updated ${result.modifiedCount} legacy trades with snapshot data.`,
            tradesToUpdate: tradesFound,
            updatedCount: result.modifiedCount
        });

    } catch (error) {
        console.error('Error backfilling trade snapshots:', error);
        res.status(500).json({ message: 'Server error during snapshot backfill.' });
    }
});

router.post('/fix-legacy-glitch-names', protect, adminOnly, async (req, res) => {
    const { dryRun } = req.body;
    const fixReport = {
        status: 'success',
        message: dryRun ? 'Dry run completed.' : 'Fix completed.',
        isDryRun: dryRun,
        details: {
            updatedUsers: 0,
            updatedCards: 0,
            failedUpdates: []
        }
    };

    try {
        const usersToUpdate = await User.find({ 'cards.name': /^Glitch / }).select('_id username cards');

        for (const user of usersToUpdate) {
            let userModified = false;
            for (const userCard of user.cards) {
                if (userCard.name && userCard.name.startsWith("Glitch ")) {
                    userCard.name = "Glitched " + userCard.name.substring("Glitch ".length);
                    fixReport.details.updatedCards++;
                    userModified = true;
                }
            }

            if (userModified) {
                fixReport.details.updatedUsers++;
                if (!dryRun) {
                    try {
                        await user.save();
                    } catch (saveError) {
                        fixReport.details.updatedUsers--;
                        fixReport.details.failedUpdates.push({ userId: user._id, username: user.username, error: saveError.message });
                    }
                }
            }
        }

        res.status(200).json(fixReport);

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while fixing legacy glitch names: ' + error.message,
            isDryRun: dryRun
        });
    }
});

router.post('/fix-missing-modifier-prefixes', protect, adminOnly, async (req, res) => {
    const { dryRun } = req.body;
    const fixReport = {
        status: 'success',
        message: dryRun ? 'Dry run completed.' : 'Fix completed.',
        isDryRun: dryRun,
        details: {
            updatedUsers: 0,
            updatedCards: 0,
            failedUpdates: []
        }
    };

    try {
        const allModifiers = await Modifier.find({}).lean();
        const modifierIdToNameMap = new Map();
        allModifiers.forEach(mod => {
            modifierIdToNameMap.set(mod._id.toString(), mod.name);
        });

        const usersToUpdate = await User.find({ 'cards.0': { '$exists': true } }).select('_id username cards');

        for (const user of usersToUpdate) {
            let userModified = false;
            for (const userCard of user.cards) {
                if (!userCard.name) continue;

                if (userCard.modifier) {
                    const modifierId = userCard.modifier.toString();
                    const modifierName = modifierIdToNameMap.get(modifierId);

                    if (modifierName) {
                        const expectedPrefix = MODIFIER_NAME_TO_PREFIX_MAP[modifierName];

                        if (expectedPrefix && !userCard.name.startsWith(expectedPrefix)) {
                            userCard.name = expectedPrefix + userCard.name;
                            fixReport.details.updatedCards++;
                            userModified = true;
                        }
                    }
                }
            }

            if (userModified) {
                fixReport.details.updatedUsers++;
                if (!dryRun) {
                    try {
                        await user.save();
                    } catch (saveError) {
                        fixReport.details.updatedUsers--;
                        fixReport.details.failedUpdates.push({ userId: user._id, username: user.username, error: saveError.message });
                    }
                }
            }
        }

        res.status(200).json(fixReport);

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while fixing missing modifier prefixes: ' + error.message,
            isDryRun: dryRun
        });
    }
});


router.post('/fix-card-data-mismatches', protect, adminOnly, async (req, res) => {
    const { dryRun } = req.body;
    const fixReport = {
        status: 'success',
        message: dryRun ? 'Dry run completed.' : 'Fix completed.',
        isDryRun: dryRun,
        details: {
            updatedUsers: 0,
            updatedCards: 0,
            failedUpdates: []
        }
    };

    try {
        const allCards = await Card.find({}).lean();
        const cardDefinitionMap = new Map();
        allCards.forEach(card => cardDefinitionMap.set(card.name, card));

        const usersWithCards = await User.find({ 'cards.0': { '$exists': true } }).select('_id username cards');

        for (const user of usersWithCards) {
            let userModified = false;
            for (const userCard of user.cards) {
                if (!userCard.name) continue;

                const baseCardName = stripCardNameModifiers(userCard.name);
                const baseCard = cardDefinitionMap.get(baseCardName);

                if (baseCard) {
                    let cardModified = false;
                    if (userCard.imageUrl !== baseCard.imageUrl) {
                        userCard.imageUrl = baseCard.imageUrl;
                        cardModified = true;
                    }
                    if (userCard.flavorText !== baseCard.flavorText) {
                        userCard.flavorText = baseCard.flavorText;
                        cardModified = true;
                    }
                    if (cardModified) {
                        fixReport.details.updatedCards++;
                        userModified = true;
                    }
                }
            }

            if (userModified) {
                fixReport.details.updatedUsers++;
                if (!dryRun) {
                    try {
                        await user.save();
                    } catch (saveError) {
                        fixReport.details.updatedUsers--;
                        fixReport.details.failedUpdates.push({ userId: user._id, username: user.username, error: saveError.message });
                    }
                }
            }
        }

        res.status(200).json(fixReport);

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'An error occurred while fixing mismatches: ' + error.message,
            isDryRun: dryRun
        });
    }
});

router.post('/fix-card-definition-inconsistencies', protect, adminOnly, async (req, res) => {
    const isDryRun = req.query.dryRun === 'true';
    console.log(`[API Fix] Initiating fix operation (Dry Run: ${isDryRun}) requested by admin: ${req.user ? req.user.username : 'Unknown'}.`);

    if (mongoose.connection.readyState !== 1) {
        console.error("[API Fix] MongoDB not connected. Cannot perform fix.");
        return res.status(500).json({ status: "error", message: "Database not connected. Please ensure MongoDB is running." });
    }

    try {
        console.log("[API Fix] Performing a quick re-audit to identify current inconsistencies for fixing...");
        const users = await User.find({ 'cards.mintNumber': { '$exists': true } }).select('_id username cards').lean();
        const allCards = await Card.find({}).lean();

        const cardDefinitionMap = new Map();
        const cardIdByNameRarityMap = new Map();

        allCards.forEach(card => {
            const raritiesMap = new Map();
            card.rarities.forEach(r => {
                raritiesMap.set(r.rarity.toLowerCase(), r);
                const key = `${card.name}|${r.rarity.toLowerCase()}`;
                cardIdByNameRarityMap.set(key, card._id.toString());
            });
            cardDefinitionMap.set(card._id.toString(), raritiesMap);
        });

        const inconsistenciesToFix = [];

        for (const user of users) {
            for (const userCard of user.cards) {
                if (!userCard.name || !userCard.rarity || typeof userCard.mintNumber !== 'number') {
                    continue;
                }

                const userCardName = String(userCard.name);
                const cleanedUserCardName = stripCardNameModifiers(userCardName);
                const userCardRarityLower = String(userCard.rarity).toLowerCase();
                const userCardMintNumber = userCard.mintNumber;

                const parentCardId = cardIdByNameRarityMap.get(`${cleanedUserCardName}|${userCardRarityLower}`);
                if (!parentCardId) {
                    continue;
                }

                const rarityDefinition = cardDefinitionMap.get(parentCardId)?.get(userCardRarityLower);
                if (!rarityDefinition) {
                    continue;
                }

                const availableMintsInCardDef = Array.isArray(rarityDefinition.availableMintNumbers) ? rarityDefinition.availableMintNumbers : [];

                if (availableMintsInCardDef.includes(userCardMintNumber)) {
                    inconsistenciesToFix.push({
                        cardId: new mongoose.Types.ObjectId(parentCardId),
                        rarity: userCardRarityLower,
                        mintNumber: userCardMintNumber,
                        cardName: userCardName,
                        cleanedCardName: cleanedUserCardName
                    });
                }
            }
        }

        console.log(`[API Fix Debug] Total inconsistencies identified by re-audit: ${inconsistenciesToFix.length}`);
        if (!isDryRun && inconsistenciesToFix.length > 0) {
            console.log(`[API Fix Debug] First 5 inconsistencies for potential fix:`);
            inconsistenciesToFix.slice(0, 5).forEach((inc, idx) => {
                console.log(`  ${idx + 1}. Card: ${inc.cardName} (${inc.rarity}) Mint: ${inc.mintNumber} (Parent ID: ${inc.cardId})`);
            });
        }

        const bulkOperations = [];
        const uniqueInconsistencies = new Set();

        for (const inc of inconsistenciesToFix) {

            const key = `${inc.cardId.toString()}|${inc.rarity}|${inc.mintNumber}`;
            if (!uniqueInconsistencies.has(key)) {
                bulkOperations.push({
                    updateOne: {
                        filter: {
                            _id: inc.cardId,
                            'rarities': {
                                '$elemMatch': {
                                    rarity: { $in: [inc.rarity, inc.rarity.charAt(0).toUpperCase() + inc.rarity.slice(1)] },
                                    availableMintNumbers: inc.mintNumber
                                }
                            }
                        },
                        update: {
                            '$pull': { 'rarities.$.availableMintNumbers': inc.mintNumber },
                            '$inc': { 'rarities.$.remainingCopies': -1 }
                        }
                    }
                });
                uniqueInconsistencies.add(key);
            }
        }

        console.log(`[API Fix Debug] Number of bulk operations prepared: ${bulkOperations.length}`);
        if (!isDryRun && bulkOperations.length > 0) {
            console.log(`[API Fix Debug] First prepared bulk operation filter:`, bulkOperations[0].updateOne.filter);
        }

        let fixedCount = 0;
        let failedCount = 0;
        const failedFixesDetails = [];

        if (bulkOperations.length === 0) {
            const dryRunMessage = isDryRun ? "(Dry Run)" : "";
            console.log(`[API Fix] No bulk operations generated. Sending fixedCount: 0. ${dryRunMessage}`);
            return res.status(200).json({
                status: "success",
                message: `No inconsistencies found to fix. ${dryRunMessage}`,
                fixedCount: 0,
                failedCount: 0,
                isDryRun: isDryRun,
                timestamp: new Date().toISOString()
            });
        }

        if (isDryRun) {
            fixedCount = bulkOperations.length;
            console.log(`[API Fix - DRY RUN] Would perform ${fixedCount} update operations.`);
            return res.status(200).json({
                status: "success",
                message: `Dry Run Complete: Would have attempted to fix ${fixedCount} inconsistencies. No database changes were made.`,
                fixedCount: fixedCount,
                failedCount: failedCount,
                isDryRun: true,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`[API Fix - ACTUAL FIX] Executing ${bulkOperations.length} bulk operations.`);
            let bulkResult;
            try {
                bulkResult = await Card.bulkWrite(bulkOperations, { ordered: false });
                console.log(`[API Fix - ACTUAL FIX] Mongoose bulkWrite completed.`);
            } catch (bulkWriteError) {
                console.error(`[API Fix ERROR] Error during Card.bulkWrite:`, bulkWriteError);
                throw bulkWriteError;
            }


            fixedCount = bulkResult.modifiedCount;
            if (bulkResult.writeErrors && bulkResult.writeErrors.length > 0) {
                failedCount = bulkResult.writeErrors.length;
                bulkResult.writeErrors.forEach(error => {
                    const originalOp = bulkOperations[error.index].updateOne;
                    const originalInconsistency = inconsistenciesToFix.find(inc =>
                        String(inc.cardId) === String(originalOp.filter._id) &&
                        inc.rarity === originalOp.filter['rarities.rarity'] &&
                        inc.mintNumber === originalOp.filter['rarities.availableMintNumbers']
                    );
                    failedFixesDetails.push({
                        ...originalInconsistency,
                        reason: error.errmsg || "Unknown write error",
                        originalFilter: originalOp.filter
                    });
                    console.error(`[API Fix ERROR] Bulk write failed for op index ${error.index}. Reason: ${error.errmsg || "Unknown error"}. Affected Filter:`, originalOp.filter);
                });
            }

            console.log(`[API Fix] Bulk operation complete. Fixed: ${fixedCount}, Failed: ${failedCount}.`);

            return res.status(200).json({
                status: "success",
                message: `Fix operation complete. Fixed ${fixedCount} inconsistencies.`,
                fixedCount: fixedCount,
                failedCount: failedCount,
                failedFixes: failedFixesDetails,
                isDryRun: false,
                timestamp: new Date().toISOString()
            });
        }

    } catch (error) {
        console.error("[API Fix Endpoint] Fatal error during fix operation:", error);
        if (!res.headersSent) {
            return res.status(500).json({ status: "error", message: "An unhandled error occurred during the fix operation: " + error.message });
        }
    }
});

router.post('/fix-duplicate-mint-numbers', protect, adminOnly, async (req, res) => {
    const isDryRun = req.query.dryRun === 'true';
    console.log(`[API Fix Duplicates/Mint0] Initiating fix operation (Dry Run: ${isDryRun})`);

    if (mongoose.connection.readyState !== 1) {
        return res.status(500).json({ status: "error", message: "Database not connected. Please ensure MongoDB is running." });
    }

    try {
        const users = await User.find({ 'cards.mintNumber': { '$exists': true } }).select('_id username cards').lean();
        const allCards = await Card.find({}).lean();

        const cardDefinitionMap = new Map();
        allCards.forEach(card => {
            const raritiesMap = new Map();
            card.rarities.forEach(r => raritiesMap.set(r.rarity.toLowerCase(), r));
            cardDefinitionMap.set(card._id.toString(), raritiesMap);
        });

        const cardIdByNameRarityMap = new Map();
        allCards.forEach(card => {
            card.rarities.forEach(r => {
                const key = `${card.name}|${r.rarity.toLowerCase()}`;
                cardIdByNameRarityMap.set(key, card._id.toString());
            });
        });

        const globalAssignedMintsTracker = new Map();
        const mint0Cards = [];

        for (const user of users) {
            for (const userCard of user.cards) {
                if (userCard.mintNumber === 0) {
                    mint0Cards.push({
                        userId: user._id,
                        username: user.username,
                        userCardId: userCard._id,
                        cardName: userCard.name,
                        rarity: userCard.rarity,
                        mintNumber: 0
                    });
                }
                const uniqueCardInstanceKey = `${userCard.name}|${String(userCard.rarity).toLowerCase()}|${userCard.mintNumber}`;
                if (!globalAssignedMintsTracker.has(uniqueCardInstanceKey)) {
                    globalAssignedMintsTracker.set(uniqueCardInstanceKey, []);
                }
                globalAssignedMintsTracker.get(uniqueCardInstanceKey).push({
                    userId: user._id,
                    username: user.username,
                    userCardId: userCard._id,
                    acquiredAt: userCard.acquiredAt
                });
            }
        }

        const trueDuplicates = [];
        for (const [key, owners] of globalAssignedMintsTracker.entries()) {
            if (owners.length > 1) {
                owners.sort((a, b) => new Date(a.acquiredAt) - new Date(b.acquiredAt));
                owners[0].isFirstOwner = true;
                trueDuplicates.push({ cardInstance: key, owners });
            }
        }

        const fixPlan = [];
        const fixed = { removeMint0: 0, rerollDuplicates: 0 };
        const failed = { removeMint0: [], rerollDuplicates: [] };

        if (isDryRun) {
            mint0Cards.forEach(card => fixPlan.push({ action: 'removeMint0', ...card }));
            for (const group of trueDuplicates) {
                group.owners.filter(o => !o.isFirstOwner).forEach(owner => {
                    fixPlan.push({ action: 'rerollDuplicate', ...owner, cardInstance: group.cardInstance });
                });
            }
            return res.status(200).json({
                status: "success",
                message: `Dry Run Complete: Would have attempted to fix ${fixPlan.length} issues. No database changes were made.`,
                isDryRun: true,
                fixPlan,
                timestamp: new Date().toISOString()
            });
        } else {
            for (const card of mint0Cards) {
                try {
                    const updateResult = await User.findOneAndUpdate(
                        { _id: card.userId, 'cards._id': card.userCardId },
                        { '$pull': { cards: { _id: card.userCardId } } }
                    );
                    if (updateResult) {
                        fixed.removeMint0++;
                    } else {
                        throw new Error("Card not found during update.");
                    }
                } catch (err) {
                    failed.removeMint0.push({ card, reason: err.message });
                    console.error(`Failed to remove mint 0 card for user ${card.username}:`, err);
                }
            }

            for (const group of trueDuplicates) {
                const [cardName, rarity, oldMint] = group.cardInstance.split('|');
                const parentCardId = cardIdByNameRarityMap.get(`${cardName}|${rarity}`);
                if (!parentCardId) {
                    console.error(`Parent card not found for duplicate fix: ${group.cardInstance}`);
                    continue;
                }
                const rarityDef = cardDefinitionMap.get(parentCardId)?.get(rarity);

                for (const owner of group.owners.filter(o => !o.isFirstOwner)) {
                    try {
                        if (!rarityDef || rarityDef.availableMintNumbers.length === 0) {
                            throw new Error("No available mint numbers for reroll.");
                        }
                        const newMint = rarityDef.availableMintNumbers[Math.floor(Math.random() * rarityDef.availableMintNumbers.length)];

                        const session = await mongoose.startSession();
                        session.startTransaction();
                        try {
                            const updateCardPromise = Card.updateOne(
                                { _id: parentCardId, 'rarities.rarity': rarity },
                                { '$pull': { 'rarities.$.availableMintNumbers': newMint } },
                                { session }
                            );
                            const updateUserPromise = User.findOneAndUpdate(
                                { _id: owner.userId, 'cards._id': owner.userCardId },
                                { '$set': { 'cards.$.mintNumber': newMint } },
                                { new: true, session }
                            );
                            await Promise.all([updateCardPromise, updateUserPromise]);
                            await session.commitTransaction();
                            fixed.rerollDuplicates++;
                        } catch (err) {
                            await session.abortTransaction();
                            throw err;
                        } finally {
                            session.endSession();
                        }
                    } catch (err) {
                        failed.rerollDuplicates.push({ owner, cardInstance: group.cardInstance, reason: err.message });
                        console.error(`Failed to reroll duplicate card for user ${owner.username}:`, err);
                    }
                }
            }
            return res.status(200).json({
                status: "success",
                message: `Fix operation complete. Removed ${fixed.removeMint0} cards and rerolled ${fixed.rerollDuplicates} duplicates.`,
                isDryRun: false,
                fixed,
                failed,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error("[API Fix Duplicates/Mint0] Fatal error:", error);
        return res.status(500).json({ status: "error", message: "An unhandled error occurred: " + error.message });
    }
});

router.get('/card-ownership/:cardId', protect, adminOnly, async (req, res) => {
    try {
        const { cardId } = req.params;
        const card = await Card.findById(cardId).lean();

        if (!card) {
            return res.status(404).json({ message: 'Card definition not found.' });
        }

        const cardNameRegex = new RegExp(`(Glitched |Negative |Prismatic )?${card.name}$`);

        const ownership = await User.aggregate([
            { $match: { 'cards.name': cardNameRegex } },
            { $unwind: '$cards' },
            { $match: { 'cards.name': cardNameRegex } },
            {
                $group: {
                    _id: {
                        rarity: '$cards.rarity',
                        userId: '$_id',
                        username: '$username',
                        selectedTitle: '$selectedTitle'
                    },
                    count: { $sum: 1 },
                    cards: { $push: '$cards' }
                }
            },
            {
                $lookup: {
                    from: 'titles',
                    localField: '_id.selectedTitle',
                    foreignField: '_id',
                    as: 'titleDoc'
                }
            },
            { $unwind: { path: '$titleDoc', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id.rarity',
                    owners: {
                        $push: {
                            userId: '$_id.userId',
                            username: '$_id.username',
                            selectedTitle: {
                                name: '$titleDoc.name',
                                color: '$titleDoc.color',
                                gradient: '$titleDoc.gradient',
                                isAnimated: '$titleDoc.isAnimated',
                                effect: '$titleDoc.effect'
                            },
                            count: '$count',
                            cards: '$cards'
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    rarity: '$_id',
                    owners: 1
                }
            },
            { $sort: { rarity: 1 } }
        ]);

        res.json(ownership);

    } catch (error) {
        console.error('Error fetching card ownership:', error);
        res.status(500).json({ message: 'Failed to fetch card ownership data.' });
    }
});


router.post('/cards/return-instance', protect, adminOnly, async (req, res) => {
    const { userId, userCardId, cardName, rarity, mintNumber } = req.body;

    if (!userId || !userCardId || !cardName || !rarity || !mintNumber) {
        return res.status(400).json({ message: 'Missing required fields: userId, userCardId, cardName, rarity, mintNumber.' });
    }

    const userCardObjectId = new mongoose.Types.ObjectId(userCardId);
    let cleanupMessage = '';

    try {
        const activeTrade = await Trade.findOne({
            status: 'pending',
            offeredItems: userCardObjectId
        });

        if (activeTrade) {
            activeTrade.status = 'cancelled';
            activeTrade.statusReason = 'Cancelled by administrator: An involved card was removed.';
            await activeTrade.save();
            cleanupMessage += `Cancelled an active trade (ID: ${activeTrade._id}). `;
        }

        const cancelledListing = await MarketListing.findOneAndUpdate(
            {
                'card.name': cardName,
                'card.rarity': rarity,
                'card.mintNumber': mintNumber,
                owner: userId,
                status: 'active'
            },
            {
                $set: {
                    status: 'cancelled',
                    cancellationReason: 'Cancelled by administrator: Card removed.'
                }
            }
        );

        if (cancelledListing) {
            cleanupMessage += 'Cancelled an active market listing. ';
        }

        const offerUpdateResult = await MarketListing.updateMany(
            {
                "offers.offeredCards": {
                    $elemMatch: { name: cardName, rarity: rarity, mintNumber: mintNumber }
                }
            },
            {
                $pull: {
                    offers: {
                        "offeredCards": {
                            $elemMatch: { name: cardName, rarity: rarity, mintNumber: mintNumber }
                        }
                    }
                }
            }
        );

        if (offerUpdateResult.modifiedCount > 0) {
            cleanupMessage += `Removed ${offerUpdateResult.modifiedCount} market offer(s) containing this card. `;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const userUpdateResult = await User.updateOne(
                { _id: userId },
                { $pull: { cards: { _id: userCardObjectId } } },
                { session }
            );

            if (userUpdateResult.modifiedCount === 0) {
                throw new Error(`Card instance ID ${userCardId} not found in user ${userId}'s collection.`);
            }

            await User.updateOne(
                {
                    _id: userId,
                    'featuredCard.name': cardName,
                    'featuredCard.rarity': rarity,
                    'featuredCard.mintNumber': mintNumber
                },
                { $unset: { featuredCard: "" } },
                { session }
            );

            const baseCardName = stripCardNameModifiers(cardName);
            const cardUpdateResult = await Card.updateOne(
                { name: baseCardName, 'rarities.rarity': rarity },
                {
                    $addToSet: { 'rarities.$.availableMintNumbers': mintNumber },
                    $inc: { 'rarities.$.remainingCopies': 1 }
                },
                { session }
            );

            if (cardUpdateResult.modifiedCount === 0) {
                throw new Error(`Could not find card definition for '${baseCardName}' with rarity '${rarity}' to return mint number.`);
            }

            await session.commitTransaction();
            res.json({ message: `Card ${cardName} #${mintNumber} successfully returned. ${cleanupMessage}`.trim() });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        console.error('Error during card return process:', error);
        res.status(500).json({ message: error.message || 'Failed to return card instance.' });
    }
});


router.post('/wipe-database', protect, adminOnly, async (req, res) => {
    const { confirmation, wipeRewardCardId, wipeRewardRarity, packAssignments } = req.body;
    if (confirmation !== 'PERMANENTLY WIPE DATA') {
        return res.status(400).json({
            message: 'Invalid confirmation phrase. The operation was cancelled.',
        });
    }

    console.log(`[DB WIPE] Wipe initiated by admin: ${req.user.username}`);

    try {
        console.log('[DB WIPE] Clearing collections...');
        const [tradeDeletion, notificationDeletion, userActivityDeletion, marketListingDeletion, eventClaimDeletion] = await Promise.all([
            Trade.deleteMany({}),
            Notification.deleteMany({}),
            UserActivity.deleteMany({}),
            MarketListing.deleteMany({}),
            EventClaim.deleteMany({})
        ]);
        console.log('[DB WIPE] Collections cleared.');

        console.log('[DB WIPE] Resetting user data...');
        const userUpdateResult = await User.updateMany({}, {
            $set: {
                packs: 1,
                cards: [],
                openedPacks: 0,
                featuredCards: [],
                favoriteCard: {},
                preferredPack: null,
                firstLogin: false,
                lastActive: null,
                loginCount: 0,
                loginStreak: 0,
                lastLogin: null,
                completedPurchases: 0,
                xp: 0,
                level: 1,
                completedTrades: 0,
                createdListings: 0,
                completedListings: 0,
                achievements: [],
                featuredAchievements: [],
                pendingEventReward: []
            },
            $unset: {
                openedCards: ""
            }
        });
        console.log(`[DB WIPE] User data reset. Modified: ${userUpdateResult.modifiedCount}`);


        let packRewardsQueued = 0;
        let packAssignmentMisses = [];

        if (packAssignments && typeof packAssignments === 'object' && Object.keys(packAssignments).length > 0) {
            console.log('[DB WIPE] Starting pack reward queuing process...');

            const inputUsernames = Object.keys(packAssignments);
            const usersFound = await User.find({ username: { $in: inputUsernames } }).select('username').lean();
            const foundUsernames = new Set(usersFound.map(u => u.username));

            for (const [username, packCount] of Object.entries(packAssignments)) {
                if (!foundUsernames.has(username)) {
                    packAssignmentMisses.push({ username: username, packs: packCount });
                }
            }

            if (packAssignmentMisses.length > 0) {
                console.warn('[DB WIPE] The following users were not found and were NOT queued for pack rewards:');
                packAssignmentMisses.forEach(miss => {
                    console.warn(`  - User: ${miss.username} (should have received ${miss.packs} packs)`);
                });
            }

            const packUpdateOps = [];
            for (const username of foundUsernames) {
                const packCount = packAssignments[username];
                if (typeof packCount === 'number' && packCount > 0) {

                    const packRewardPayload = {
                        type: 'PACK',
                        data: { amount: packCount },
                        message: `Thanks for your participation! Here are the ${packCount} packs you acquired during the beta, thank you for your continued support, Joe.`
                    };

                    packUpdateOps.push({
                        updateOne: {
                            filter: { username: username },
                            update: {
                                $push: { pendingEventReward: packRewardPayload },
                                $inc: { packs: packCount }
                            }
                        }
                    });
                }
            }

            if (packUpdateOps.length > 0) {
                const bulkResult = await User.bulkWrite(packUpdateOps);
                packRewardsQueued = bulkResult.modifiedCount;
                console.log(`[DB WIPE] Pack rewards granted and queued for ${packRewardsQueued} users.`);
            }
        }


        console.log('[DB WIPE] Resetting card definitions (mint numbers)...');
        const allCards = await Card.find({}).lean();
        const bulkCardOps = allCards.map(card => {
            const updatedRarities = card.rarities.map(r => ({ ...r, remainingCopies: r.totalCopies, availableMintNumbers: Array.from({ length: r.totalCopies }, (_, i) => i + 1) }));
            return { updateOne: { filter: { _id: card._id }, update: { $set: { rarities: updatedRarities } } } };
        });
        let cardUpdateResult = { modifiedCount: 0 };
        if (bulkCardOps.length > 0) {
            cardUpdateResult = await Card.bulkWrite(bulkCardOps);
        }
        console.log(`[DB WIPE] Card definitions reset. Modified: ${cardUpdateResult.modifiedCount}`);

        let wipeRewardsGranted = 0;
        if (wipeRewardCardId && wipeRewardRarity) {
            console.log(`[DB WIPE] Starting wipe reward grant process for Card ID: ${wipeRewardCardId}`);
            const allUsers = await User.find({});

            for (const user of allUsers) {
                try {
                    const grantedCard = await grantCardReward(user, {
                        cardId: wipeRewardCardId,
                        rarity: wipeRewardRarity
                    });

                    if (grantedCard) {
                        const rewardPayload = {
                            type: 'CARD',
                            data: grantedCard,
                            message: 'Thanks for participating in the Neds Decks Beta, have an exclusive card on us! Cheers, Joe.'
                        };
                        if (!user.pendingEventReward) {
                            user.pendingEventReward = [];
                        }
                        user.pendingEventReward.push(rewardPayload);
                        await user.save();
                        wipeRewardsGranted++;
                    }
                } catch (grantError) {
                    console.error(`[DB WIPE] Failed to grant wipe reward to ${user.username}: ${grantError.message}`);
                }
            }
            console.log(`[DB WIPE] Finished granting wipe rewards. Granted to ${wipeRewardsGranted} users.`);
        }

        res.status(200).json({
            message: 'Database wipe completed successfully!',
            details: {
                deletedTrades: tradeDeletion.deletedCount,
                deletedNotifications: notificationDeletion.deletedCount,
                deletedUserActivities: userActivityDeletion.deletedCount,
                deletedMarketListings: marketListingDeletion.deletedCount,
                deletedEventClaims: eventClaimDeletion.deletedCount,
                usersReset: userUpdateResult.modifiedCount,
                cardsReset: cardUpdateResult.modifiedCount,
                wipeRewardsGranted: wipeRewardsGranted,
            }
        });

    } catch (error) {
        console.error('[DB WIPE] An error occurred during the wipe operation:', error);
        res.status(500).json({
            message: 'A critical error occurred. Check server logs.',
            error: error.message,
        });
    }
});

router.get('/pack-luck', protect, adminOnly, async (req, res) => {
    try {
        const wk = getWeeklyKey();
        const [weeklyDoc, overrideSetting] = await Promise.all([
            PeriodCounter.findOne({ scope: 'weekly', periodKey: wk.periodKey }).lean(),
            Setting.findOne({ key: 'packLuckOverride' }).lean()
        ]);

        const overrideValue = overrideSetting?.value || {};
        const overrideEnabled = Boolean(overrideValue.enabled);
        const overrideCount = Number.isFinite(Number(overrideValue.count))
            ? Number(overrideValue.count)
            : null;

        res.json({
            weekly: {
                periodKey: wk.periodKey,
                count: weeklyDoc?.count ?? 0
            },
            override: {
                enabled: overrideEnabled,
                count: overrideCount
            }
        });
    } catch (error) {
        console.error('Error fetching pack luck status:', error);
        res.status(500).json({ message: 'Failed to fetch pack luck status.' });
    }
});

router.post('/pack-luck/override', protect, adminOnly, async (req, res) => {
    const count = Number(req.body?.count);
    if (!Number.isFinite(count) || count < 0) {
        return res.status(400).json({ message: 'Count must be a non-negative number.' });
    }

    try {
        const updated = await Setting.findOneAndUpdate(
            { key: 'packLuckOverride' },
            { value: { enabled: true, count } },
            { new: true, upsert: true }
        );

        res.json({
            message: `Pack luck override enabled at ${count}.`,
            override: updated.value
        });
    } catch (error) {
        console.error('Error enabling pack luck override:', error);
        res.status(500).json({ message: 'Failed to set pack luck override.' });
    }
});

router.post('/pack-luck/clear', protect, adminOnly, async (req, res) => {
    try {
        const updated = await Setting.findOneAndUpdate(
            { key: 'packLuckOverride' },
            { value: { enabled: false } },
            { new: true, upsert: true }
        );

        res.json({
            message: 'Pack luck override cleared. Using live weekly count.',
            override: updated.value
        });
    } catch (error) {
        console.error('Error clearing pack luck override:', error);
        res.status(500).json({ message: 'Failed to clear pack luck override.' });
    }
});

router.post('/settings/maintenance', protect, adminOnly, async (req, res) => {
    const { mode } = req.body;

    if (typeof mode !== 'boolean') {
        return res.status(400).json({ message: 'A boolean "mode" value is required.' });
    }

    try {
        const updatedSetting = await Setting.findOneAndUpdate(
            { key: 'maintenanceMode' },
            { value: mode },
            { new: true, upsert: true }
        );

        req.io.emit('maintenanceStatusChanged', { maintenanceMode: updatedSetting.value });

        res.json({
            message: `Maintenance mode is now ${mode ? 'ON' : 'OFF'}.`,
            maintenanceMode: updatedSetting.value
        });
    } catch (error) {
        console.error('Error toggling maintenance mode:', error);
        res.status(500).json({ message: 'Server error while updating settings.' });
    }
});

router.get('/catalogue', protect, adminOnly, async (req, res) => {
    try {
        const {
            search = '',
            rarity = '',
            sort = '',
            page = 1,
            limit = 50,
        } = req.query;

        const query = {};

        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        if (rarity) {
            query['rarities.rarity'] = rarity;
        }

        let sortOption = { name: 1 };
        if (sort) {
            const direction = sort.startsWith('-') ? -1 : 1;
            const field = sort.replace(/^-/, '');
            sortOption = { [field]: direction };
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [cards, totalCards] = await Promise.all([
            Card.find(query)
                .sort(sortOption)
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Card.countDocuments(query),
        ]);

        res.status(200).json({
            cards,
            totalCards,
            page: parseInt(page),
            limit: parseInt(limit),
        });
    } catch (error) {
        console.error('Error fetching admin catalogue:', error.message);
        res.status(500).json({ message: 'Failed to fetch admin catalogue', error: error.message });
    }
});


router.post('/grant-gift', protect, adminOnly, async (req, res) => {
    const { username, rewardType, rewardDetails, message } = req.body;
    const adminUser = req.user;

    if (!username || !rewardType || !rewardDetails) {
        return res.status(400).json({ message: 'Username, rewardType, and rewardDetails are required.' });
    }

    try {
        const targetUser = await User.findOne({ username: username });
        if (!targetUser) {
            return res.status(404).json({ message: `User '${username}' not found.` });
        }

        let grantedData = null;
        let notificationMessage = '';

        switch (rewardType.toUpperCase()) {
            case 'RANDOM_CARD':
            case 'CARD':
                grantedData = await grantCardReward(targetUser, rewardDetails);
                if (grantedData) {
                    notificationMessage = `You've been gifted the card '${grantedData.name}' (Mint #${grantedData.mintNumber})! (${message})`;
                }
                break;

            case 'PACK':
                grantedData = await grantPackReward(targetUser, rewardDetails);
                if (grantedData) {
                    const plural = grantedData.amount > 1 ? 's' : '';
                    notificationMessage = `You've been gifted ${grantedData.amount} pack${plural}! (${message})`;
                }
                break;

            case 'XP':
                grantedData = await grantXpReward(targetUser, rewardDetails);
                if (grantedData) {
                    notificationMessage = `You've been gifted ${grantedData.amount} XP! (${message})`;
                }
                break;

            default:
                return res.status(400).json({ message: `Invalid rewardType: '${rewardType}'.` });
        }

        if (!grantedData) {
            return res.status(500).json({ message: `Failed to grant ${rewardType} reward. The card might be out of mints or the details were invalid.` });
        }

        const rewardPayload = {
            type: rewardType.toUpperCase(),
            data: grantedData,
            message: message || `A gift from Joe!`
        };
        targetUser.pendingEventReward.push(rewardPayload);
        await targetUser.save();

        const notificationPayload = {
            type: 'Admin Gift',
            message: notificationMessage,
            link: `/collection/${targetUser.username}`
        };
        await createNotification(targetUser._id, notificationPayload);
        sendNotificationToUser(targetUser._id, notificationPayload);

        await createLogEntry(
            adminUser,
            'ADMIN_GIFT_GRANTED',
            `Granted ${rewardType} to user '${targetUser.username}'. Details: ${JSON.stringify(grantedData)}`,
            { targetUserId: targetUser._id, reward: rewardPayload }
        );

        res.status(200).json({
            message: `Successfully granted ${rewardType} gift to ${username}.`,
            grantedData
        });

    } catch (error) {
        console.error(`[Admin Gift] Critical error while granting gift:`, error);
        res.status(500).json({ message: 'Server error during gift grant process.', error: error.message });
    }
});



router.get('/queues/status', protect, adminOnly, async (req, res) => {
    try {
        const status = await getStatus();
        res.json(status);
    } catch (error) {
        console.error("Error getting queue status:", error);
        res.status(500).json({ message: "Error getting queue status" });
    }
});

router.post('/queues/pause', protect, adminOnly, (req, res) => {
    pauseQueue();
    res.json({ success: true, message: 'Queue paused.' });
});

router.post('/queues/resume', protect, adminOnly, (req, res) => {
    resumeQueue();
    res.json({ success: true, message: 'Queue resumed.' });
});


router.post('/trigger-monthly-payout', protect, adminOnly, async (req, res) => {
    try {
        const result = await handleMonthlyPayout(true);
        if (result.success) {
            res.json({ message: result.message });
        } else {
            res.status(400).json({ message: result.message });
        }
    } catch (error) {
        console.error('Manual payout error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
