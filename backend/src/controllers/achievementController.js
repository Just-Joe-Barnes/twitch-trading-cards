const User = require('../models/userModel');
const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const ACHIEVEMENTS = require('../../../config/achievements');
const {generateCardWithProbability} = require('../helpers/cardHelpers');
const {createLogEntry} = require("../utils/logService");
const ALL_RARITIES = ['Basic', 'Common', 'Standard', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic', 'Unique', 'Divine'];

const getAchievements = async (req, res) => {
    try {
        const userDoc = await User.findById(req.user._id);
        if (!userDoc) return res.status(404).json({message: 'User not found'});
        const {checkAndGrantAchievements} = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(userDoc);
        const user = userDoc.toObject();
        const [tradeCount, listingCount] = await Promise.all([
            Trade.countDocuments({ $or: [{sender: user._id}, {recipient: user._id}], status: 'accepted' }),
            MarketListing.countDocuments({owner: user._id, status: 'sold'})
        ]);
        const uniqueCards = new Set((user.cards || []).map(c => c.name)).size;
        const byName = {}; (user.cards || []).forEach(c => { if (!byName[c.name]) byName[c.name] = new Set(); byName[c.name].add(c.rarity); });
        let fullSets = 0; for (const rarities of Object.values(byName)) { if (ALL_RARITIES.every(r => rarities.has(r))) fullSets += 1; }
        const featuredCount = (user.featuredCards || []).length; const modifierCards = (user.cards || []).filter(c => c.modifier).length; const raritiesOwned = new Set((user.cards || []).map(c => c.rarity)).size;
        const hasModifierCard = (user.cards || []).some(c => c.modifier); const hasLegendaryCard = (user.cards || []).some(c => ['Legendary', 'Mythic', 'Unique', 'Divine'].includes(c.rarity));
        const achievements = ACHIEVEMENTS.map(a => {
            let current = 0;
            if (a.field === 'completedTrades') current = tradeCount; else if (a.field === 'completedListings') current = listingCount; else if (a.field === 'uniqueCards') current = uniqueCards; else if (a.field === 'fullSets') current = fullSets;
            else if (a.field === 'hasModifierCard') current = hasModifierCard ? 1 : 0; else if (a.field === 'hasLegendaryCard') current = hasLegendaryCard ? 1 : 0; else if (a.field === 'favoriteCard') current = user.favoriteCard ? 1 : 0;
            else if (a.field === 'featuredCardsCount') current = featuredCount; else if (a.field === 'modifierCards') current = modifierCards; else if (a.field === 'raritiesOwned') current = raritiesOwned; else current = user[a.field] || 0;
            const achieved = current >= a.threshold; const userAch = user.achievements?.find(ua => ua.name === a.name);
            return { name: a.name, description: a.description, requirement: a.threshold, current: Math.min(current, a.threshold), achieved, reward: a.reward || {}, ...(userAch ? {dateEarned: userAch.dateEarned, claimed: userAch.claimed} : {claimed: false}) };
        });
        if (user.isAdmin) {
            achievements.push({ name: 'Debug: Free Pack', description: 'Admin only - grants one pack', requirement: 1, current: 1, achieved: true, reward: {packs: 1}, claimed: false, });
            achievements.push({ name: 'Debug: Random Card', description: 'Admin only - grants a random card', requirement: 1, current: 1, achieved: true, reward: {card: true}, claimed: false, });
        }
        res.json({achievements});
    } catch (err) { console.error('Error fetching achievements:', err.message); res.status(500).json({message: 'Failed to fetch achievements'}); }
};

const claimAchievementReward = async (req, res) => {
    try {
        const {name} = req.body;
        if (!name) return res.status(400).json({message: 'Achievement name required'});

        let user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({message: 'User not found'});

        if (name === 'Debug: Free Pack' || name === 'Debug: Random Card') {
            if (!user.isAdmin) return res.status(403).json({message: 'Admin only'});
            let rewardPayload = null; let message = '';
            if (name === 'Debug: Free Pack') {
                user.packs = (user.packs || 0) + 1;
                message = `Added 1 pack`;
                rewardPayload = { type: 'PACK', data: { amount: 1 }, message: `From Admin Debug` };
            } else {
                const rewardCard = await generateCardWithProbability();
                if (!rewardCard) return res.status(500).json({message: 'Failed to generate card reward'});
                rewardCard.acquiredAt = new Date();
                user.cards.push(rewardCard);
                message = `${rewardCard.name} (#${rewardCard.mintNumber}) [${rewardCard.rarity}]`;
                rewardPayload = { type: 'CARD', data: rewardCard, message: `From Admin Debug` };
            }
            await createLogEntry(user, 'DEBUG_ACHIEVEMENT_AWARDED', `${name} - ${message}`);
            await user.save();
            return res.json({success: true, pendingRewards: rewardPayload ? [rewardPayload] : []});
        }

        const {checkAndGrantAchievements} = require('../helpers/achievementHelper');
        await checkAndGrantAchievements(user);

        user = await User.findById(req.user._id);
        const ach = user.achievements.find(a => a.name === name);
        if (!ach) return res.status(400).json({message: 'Achievement not unlocked'});
        if (ach.claimed) return res.status(400).json({message: 'Reward already claimed'});

        const reward = ach.reward || {};
        let rewardPayload = null; let message = '';
        if (reward.packs) {
            user.packs = (user.packs || 0) + reward.packs;
            message = `Added ${reward.packs} pack${reward.packs > 1 ? 's' : ''}`;
            rewardPayload = { type: 'PACK', data: { amount: reward.packs }, message: `From Achievement: ${name}` };
        }
        if (reward.card) {
            const rewardCard = await generateCardWithProbability();
            if (!rewardCard) return res.status(500).json({message: 'Failed to generate card reward: no cards available'});
            rewardCard.acquiredAt = new Date();
            message = `${rewardCard.name} (#${rewardCard.mintNumber}) [${rewardCard.rarity}]`;
            user.cards.push(rewardCard);
            rewardPayload = { type: 'CARD', data: rewardCard, message: `From Achievement: ${name}` };
        }

        const achToUpdate = user.achievements.find(a => a.name === name);
        if (achToUpdate) achToUpdate.claimed = true;

        await createLogEntry(user, 'ACHIEVEMENT_AWARDED', `${name} - ${message}`);

        await user.save();

        res.json({success: true, pendingRewards: rewardPayload ? [rewardPayload] : []});

    } catch (err) {
        console.error('Error claiming achievement:', err.message);
        await createLogEntry(req.user, 'ERROR_ACHIEVEMENT_AWARDED', err.message);
        res.status(500).json({message: 'Failed to claim achievement reward'});
    }
};

const clearPendingReward = async (req, res) => {
    try {
        const { rewardId } = req.body;
        console.log('--- CLEARING PENDING REWARD ---'); console.log(`Received rewardId: ${rewardId}`); console.log('Full body:', JSON.stringify(req.body, null, 2)); console.log('-------------------------------');
        if (!rewardId) { console.warn('Clear reward failed: No rewardId provided.'); return res.status(400).json({ message: 'Reward ID is required.' }); }
        const updateResult = await User.updateOne( { _id: req.user._id }, { $pull: { pendingEventReward: { _id: rewardId } } } );
        if (updateResult && updateResult.modifiedCount === 0) { console.warn(`Clear reward: No reward found with _id: ${rewardId} for user ${req.user._id}`); }
        else { console.log(`Successfully cleared reward ${rewardId} for user ${req.user._id}`); }
        res.status(200).json({ success: true, message: 'Reward cleared.' });
    } catch (error) { console.error('Error clearing reward:', error); res.status(500).json({ message: 'Server error clearing reward.' }); }
};

module.exports = { getAchievements, claimAchievementReward, clearPendingReward };
