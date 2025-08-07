// File: backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');
const ftp = require('basic-ftp');
const path = require('path');
const { Readable } = require('stream');

// Models
const User = require('../models/userModel');
const Card = require('../models/cardModel');
const Pack = require('../models/packModel');
const Notification = require('../models/notificationModel');
const Achievement = require('../models/achievementModel');

// Middleware & Services
const { protect } = require('../middleware/authMiddleware');
const { broadcastNotification } = require('../../notificationService');


// --- Middleware & Helper Functions ---

// Middleware to check admin privileges (updated)
const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

const MODIFIER_PREFIXES = ["Glitched ", "Negative ", "Prismatic "];
const stripCardNameModifiers = (cardName) => {
    if (typeof cardName !== 'string') return cardName; // Ensure it's a string
    for (const modifier of MODIFIER_PREFIXES) {
        if (cardName.startsWith(modifier)) {
            return cardName.substring(modifier.length);
        }
    }
    return cardName;
};

const slugify = (text) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');        // Replace multiple - with single -
};

// --- User & Pack Management Routes ---

// API to clear all cards for a specific user
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
        // Clear the cards array
        user.cards = [];
        await user.save();
        res.json({ message: 'All cards removed successfully.' });
    } catch (error) {
        console.error('Error clearing cards:', error);
        res.status(500).json({ error: 'Failed to clear cards.' });
    }
});

// API to set all users' pack count to 6
router.post('/set-packs', protect, adminOnly, async (req, res) => {
    try {
        const result = await User.updateMany({}, { packs: 6 });
        res.json({ message: 'All users now have 6 packs.', updatedCount: result.modifiedCount });
    } catch (error) {
        console.error('Error updating pack count for all users:', error);
        res.status(500).json({ error: 'Failed to update packs for all users.' });
    }
});

// API to add a specific number of packs to all users
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

// POST give X packs to a single user
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

// GET list of users (id + username + packs)
router.get('/users', protect, adminOnly, async (req, res) => {
    const start = process.hrtime();
    try {
        const dbStart = process.hrtime();
        const users = await User.find({}, 'username packs preferredPack')
            .populate('preferredPack', 'name')
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

// GET list of users with activity status
router.get('/users-activity', protect, adminOnly, async (req, res) => {
    try {
        const { activeMinutes } = req.query;
        const activeMinutesNum = parseInt(activeMinutes) || 15; // Default to 15 minutes

        let query = {};
        if (activeMinutes) {
            const cutoff = new Date(Date.now() - activeMinutesNum * 60 * 1000);
            query = { lastActive: { $gte: cutoff } };
        }

        const users = await User.find(query, 'username packs lastActive preferredPack twitchProfilePic')
            .populate('preferredPack', 'name')
            .sort({ lastActive: -1 });

        res.json(users);
    } catch (err) {
        console.error('Error fetching users with activity:', err);
        res.status(500).json({ error: 'Failed to fetch users with activity.' });
    }
});


// --- Notification Routes ---

// New endpoint: Broadcast custom notification to all users
router.post('/notifications', protect, adminOnly, async (req, res) => {
    const { type, message, link = "" } = req.body; // Allow optional link
    if (!type || !message) {
        return res.status(400).json({ message: 'Type and message are required.' });
    }
    try {
        const notification = {
            type,
            message,
            link: link,
            extra: {},
            isRead: false,
            createdAt: new Date()
        };

        console.log("[AdminRoutes] Broadcasting notification:", notification);

        const users = await User.find({}, '_id').lean();
        const docs = users.map(u => ({ ...notification, userId: u._id }));
        if (docs.length > 0) {
            await Notification.insertMany(docs);
        }

        broadcastNotification(notification);

        res.status(200).json({ message: 'Notification broadcast successfully.' });
    } catch (error) {
        console.error('Error broadcasting notification:', error.message);
        res.status(500).json({ message: 'Error broadcasting notification.' });
    }
});


// --- Card & Pack CRUD Routes ---

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
        const { name, flavorText, imageUrl, availableFrom, availableTo, rarities } = req.body;

        const newCard = new Card({
            name,
            flavorText,
            imageUrl,
            availableFrom: availableFrom ? new Date(availableFrom) : null,
            availableTo: availableTo ? new Date(availableTo) : null,
            rarities: rarities || [],
        });

        await newCard.save();
        res.json({ message: 'Card created successfully', card: newCard });
    } catch (error) {
        console.error('Error creating card:', error);
        res.status(500).json({ message: 'Failed to create card' });
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

router.put('/cards/:cardId', protect, adminOnly, async (req, res) => {
    try {
        const { name, flavorText, imageUrl } = req.body;
        const card = await Card.findById(req.params.cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const oldName = card.name;

        card.name = name || card.name;
        card.flavorText = flavorText || card.flavorText;
        card.imageUrl = imageUrl || card.imageUrl;

        await card.save();

        const updateData = {
            'cards.$[elem].name': card.name,
            'cards.$[elem].imageUrl': card.imageUrl,
            'cards.$[elem].flavorText': card.flavorText,
        };
        const arrayFilters = [{ 'elem.name': oldName }];

        await User.updateMany({ 'cards.name': oldName }, { $set: updateData }, { arrayFilters });
        await User.updateMany({ 'openedCards.name': oldName }, {
            $set: {
                'openedCards.$[elem].name': card.name,
                'openedCards.$[elem].imageUrl': card.imageUrl,
                'openedCards.$[elem].flavorText': card.flavorText,
            },
        }, { arrayFilters });
        await User.updateMany({ 'featuredCards.name': oldName }, {
            $set: {
                'featuredCards.$[elem].name': card.name,
                'featuredCards.$[elem].imageUrl': card.imageUrl,
                'featuredCards.$[elem].flavorText': card.flavorText,
            },
        }, { arrayFilters });

        res.json({ message: 'Card updated successfully', card });
    } catch (error) {
        console.error('Error updating card:', error);
        res.status(500).json({ message: 'Failed to update card' });
    }
});

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
    const { packId, name, cardPool } = req.body;
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


// --- Achievement Management Endpoints ---
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


// --- Card Data Integrity & Auditing Routes ---

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
            cardDataMismatches: [], // New
            mint0Cards: [], // New
        }
    };

    if (mongoose.connection.readyState !== 1) {
        auditResults.status = "error";
        auditResults.message = "Database not connected.";
        return res.status(500).json(auditResults);
    }

    try {
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
            // Updated map to store the full card for data comparison
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

                // New check for Mint #0 cards
                if (userCard.mintNumber === 0) {
                    auditResults.details.mint0Cards.push({ userId: user._id, username: user.username, userCard });
                }

                const userCardName = String(userCard.name);
                const cleanedUserCardName = stripCardNameModifiers(userCardName);
                const userCardRarityLower = String(userCard.rarity).toLowerCase();
                const userCardMintNumber = userCard.mintNumber;
                const acquiredAt = userCard.acquiredAt;

                const uniqueCardInstanceKey = `${userCardName}|${userCardRarityLower}|${userCardMintNumber}`;
                if (!globalAssignedMintsTracker.has(uniqueCardInstanceKey)) {
                    globalAssignedMintsTracker.set(uniqueCardInstanceKey, []);
                }
                globalAssignedMintsTracker.get(uniqueCardInstanceKey).push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, acquiredAt });

                const parentCardId = cardIdByNameRarityMap.get(`${cleanedUserCardName}|${userCardRarityLower}`);

                if (!parentCardId) {
                    auditResults.details.missingParentCardDefinitions.push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, cleanedCardName: cleanedUserCardName, issue: "No matching parent card definition found" });
                    continue;
                }

                const parentDef = cardDefinitionMap.get(parentCardId);
                const rarityDefinition = parentDef?.raritiesMap.get(userCardRarityLower);

                // New check for data mismatches (image, flavor text)
                if (parentDef) {
                    const mismatches = [];
                    if (userCard.imageUrl !== parentDef.baseCard.imageUrl) mismatches.push({ field: 'imageUrl', userValue: userCard.imageUrl, baseValue: parentDef.baseCard.imageUrl });
                    if (userCard.flavorText !== parentDef.baseCard.flavorText) mismatches.push({ field: 'flavorText', userValue: userCard.flavorText, baseValue: parentDef.baseCard.flavorText });
                    if (mismatches.length > 0) {
                        auditResults.details.cardDataMismatches.push({ userId: user._id, username: user.username, userCard, mismatches });
                    }
                }

                if (!rarityDefinition) {
                    auditResults.details.missingRarityDefinitions.push({ userId: user._id, username: user.username, cardIndex, userCardData: userCard, cleanedCardName: cleanedUserCardName, parentCardId, issue: "No matching rarity definition found in parent" });
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
            cardDataMismatchesCount: auditResults.details.cardDataMismatches.length, // New
            mint0CardsCount: auditResults.details.mint0Cards.length, // New
        };

        return res.status(200).json(auditResults);

    } catch (error) {
        auditResults.status = "error";
        auditResults.message = "An unhandled error occurred during the card audit: " + error.message;
        return res.status(500).json(auditResults);
    }
});

// NEW route to fix data mismatches
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
                fixReport.details.updatedUsers++; // Count user for dry run report
                if (!dryRun) {
                    try {
                        await user.save();
                    } catch (saveError) {
                        // If save fails, remove from updatedUsers count and add to failed
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

/**
 * GET /api/admin/card-ownership/:cardId
 * Finds all owners of a specific card, grouped by rarity.
 */
router.get('/card-ownership/:cardId', protect, adminOnly, async (req, res) => {
    try {
        const { cardId } = req.params;
        const card = await Card.findById(cardId).lean();

        if (!card) {
            return res.status(404).json({ message: 'Card definition not found.' });
        }

        // We need a regex to match the base card name, ignoring prefixes like "Glitched "
        // This regex ensures we match "Card Name" as well as "Glitched Card Name", etc.
        const cardNameRegex = new RegExp(`(Glitched |Negative |Prismatic )?${card.name}$`);

        const ownership = await User.aggregate([
            // 1. Find all users who have at least one version of this card
            { $match: { 'cards.name': cardNameRegex } },

            // 2. Deconstruct the cards array to process each card individually
            { $unwind: '$cards' },

            // 3. Filter the unwound cards to only keep the ones that match our card
            { $match: { 'cards.name': cardNameRegex } },

            // 4. Group by rarity and user to count cards and collect instances
            {
                $group: {
                    _id: {
                        rarity: '$cards.rarity',
                        userId: '$_id',
                        username: '$username'
                    },
                    count: { $sum: 1 },
                    cards: { $push: '$cards' } // Collect the full card objects
                }
            },

            // 5. Group again by rarity to create the nested owners list
            {
                $group: {
                    _id: '$_id.rarity',
                    owners: {
                        $push: {
                            userId: '$_id.userId',
                            username: '$_id.username',
                            count: '$count',
                            cards: '$cards'
                        }
                    }
                }
            },

            // 6. Project to the final, clean format
            {
                $project: {
                    _id: 0,
                    rarity: '$_id',
                    owners: 1
                }
            },

            // 7. Sort by rarity (optional, but nice)
            { $sort: { rarity: 1 } }
        ]);

        res.json(ownership);

    } catch (error) {
        console.error('Error fetching card ownership:', error);
        res.status(500).json({ message: 'Failed to fetch card ownership data.' });
    }
});

module.exports = router;
