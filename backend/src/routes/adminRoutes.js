// File: backend/src/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/userModel');
const { protect } = require('../middleware/authMiddleware');
const { broadcastNotification } = require('../../notificationService');

// Middleware to check admin privileges
const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

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

        // Update the database: push the notification into every user's notifications array
        await User.updateMany({}, { $push: { notifications: notification } });

        // Emit a real-time notification event to all connected clients
        broadcastNotification(notification);

        res.status(200).json({ message: 'Notification broadcast successfully.' });
    } catch (error) {
        console.error('Error broadcasting notification:', error.message);
        res.status(500).json({ message: 'Error broadcasting notification.' });
    }
});

// GET list of users (id + username + packs)
router.get('/users', protect, adminOnly, async (req, res) => {
    const start = process.hrtime();
    try {
        const dbStart = process.hrtime();
        const users = await User.find({}, 'username packs').lean();
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

        const users = await User.find(query, 'username packs lastActive')
                                .sort({ lastActive: -1 }); // Sort by last active, most recent first

        res.json(users);
    } catch (err) {
        console.error('Error fetching users with activity:', err);
        res.status(500).json({ error: 'Failed to fetch users with activity.' });
    }
});

/**
 * Grant a specific card to a user
 * POST /api/admin/grant-card
 * Body: { userId, cardId, rarity, mintNumber }
 */
router.post('/grant-card', protect, adminOnly, async (req, res) => {
    const { userId, cardId, rarity, mintNumber } = req.body;
    if (!userId || !cardId || !rarity || mintNumber == null) {
        return res.status(400).json({ message: 'userId, cardId, rarity, and mintNumber are required.' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const Card = require('../models/cardModel');
        const cardDoc = await Card.findById(cardId);
        if (!cardDoc) return res.status(404).json({ message: 'Card not found' });

        const rarityObj = cardDoc.rarities.find(r => r.rarity === rarity);
        if (!rarityObj) return res.status(400).json({ message: 'Invalid rarity for this card' });

        // Check mint number availability
        if (!rarityObj.availableMintNumbers.includes(mintNumber)) {
            return res.status(400).json({ message: 'Mint number not available' });
        }

        // Remove mint number from available list and decrement remaining copies
        rarityObj.availableMintNumbers = rarityObj.availableMintNumbers.filter(n => n !== mintNumber);
        rarityObj.remainingCopies -= 1;
        await cardDoc.save();

        // Add card to user
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

/**
 * Update card availability window and series
 * POST /api/admin/update-card-availability
 * Body: { cardId, availableFrom, availableTo, series }
 */
router.post('/update-card-availability', protect, adminOnly, async (req, res) => {
    const { cardId, availableFrom, availableTo, series } = req.body;
    if (!cardId) {
        return res.status(400).json({ message: 'cardId is required.' });
    }
    try {
        const Card = require('../models/cardModel');
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

/**
 * Create or update a pack
 * POST /api/admin/upsert-pack
 * Body: { packId (optional), name, cardPool }
 */
router.post('/upsert-pack', protect, adminOnly, async (req, res) => {
    const { packId, name, cardPool } = req.body;
    try {
        const Pack = require('../models/packModel');
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

/**
 * Grant a pack to a user
 * POST /api/admin/grant-pack
 * Body: { userId, packId }
 */
router.post('/grant-pack', protect, adminOnly, async (req, res) => {
    const { userId, packId } = req.body;
    if (!userId || !packId) {
        return res.status(400).json({ message: 'userId and packId are required.' });
    }
    try {
        const Pack = require('../models/packModel');
        const pack = await Pack.findById(packId);
        if (!pack) return res.status(404).json({ message: 'Pack not found' });

        const User = require('../models/userModel');
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

const Card = require('../models/cardModel');
const Pack = require('../models/packModel');
const Achievement = require('../models/achievementModel');

router.get('/packs', async (req, res) => {
  try {
    const packs = await Pack.find();
    res.json({ packs });
  } catch (error) {
    console.error('Error fetching packs:', error);
    res.status(500).json({ message: 'Failed to fetch packs' });
  }
});

router.get('/cards', async (req, res) => {
  try {
    const cards = await Card.find();

    // Group cards by rarity
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

router.delete('/packs/:packId', protect, adminOnly, async (req, res) => {
  try {
    const Pack = require('../models/packModel');
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

router.post('/cards', protect, adminOnly, async (req, res) => {
  try {
    const Card = require('../models/cardModel');
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

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, require('path').join(__dirname, '../../public/uploads/cards'));
  },
  filename: function(req, file, cb) {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

router.post('/upload', protect, adminOnly, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const imageUrl = `/uploads/cards/${req.file.filename}`;
  res.json({ imageUrl });
});

router.delete('/cards/:cardId', protect, adminOnly, async (req, res) => {
  try {
    const Card = require('../models/cardModel');
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

router.put('/cards/:cardId', protect, adminOnly, async (req, res) => {
  try {
    const { name, flavorText, imageUrl } = req.body;
    const Card = require('../models/cardModel');
    const User = require('../models/userModel');
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

// ----- Achievement Management Endpoints -----
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

module.exports = router;
