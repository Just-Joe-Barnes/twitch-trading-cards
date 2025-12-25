const User = require('../models/userModel');
const Title = require('../models/titleModel');
const ACHIEVEMENTS = require('../../../config/achievements');
const { generateCardWithProbability } = require('../helpers/cardHelpers');
const { createLogEntry } = require('../utils/logService');
const { buildAchievementProgressMap } = require('../helpers/achievementProgress');

const getAchievements = async (req, res) => {
    try {
        const userDoc = await User.findById(req.user._id);
        if (!userDoc) return res.status(404).json({message: 'User not found'});
        const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
        const { progressMap } = await buildAchievementProgressMap(userDoc, ACHIEVEMENTS);
        await checkAndGrantAchievements(userDoc, progressMap);
        const user = userDoc.toObject();

        const achievements = ACHIEVEMENTS.map((a) => {
            const key = a.key || a.name;
            const progress = progressMap[key] || {
                current: user[a.field] || 0,
                threshold: a.threshold,
                unlocked: false,
            };
            const achieved = progress.unlocked;
            const current = progress.current || 0;
            const userAch = user.achievements?.find((ua) => ua.name === a.name);
            return {
                key,
                name: a.name,
                description: a.description,
                category: a.category || 'General',
                tier: Number.isFinite(a.tier) ? a.tier : null,
                requirement: a.threshold,
                current: Math.min(current, a.threshold),
                achieved,
                reward: a.reward || {},
                ...(userAch ? {dateEarned: userAch.dateEarned, claimed: userAch.claimed} : {claimed: false}),
            };
        });
        if (user.isAdmin) {
            achievements.push({
                key: 'DEBUG_FREE_PACK',
                name: 'Debug: Free Pack',
                description: 'Admin only - grants one pack',
                category: 'Admin',
                tier: null,
                requirement: 1,
                current: 1,
                achieved: true,
                reward: {packs: 1},
                claimed: false,
            });
            achievements.push({
                key: 'DEBUG_RANDOM_CARD',
                name: 'Debug: Random Card',
                description: 'Admin only - grants a random card',
                category: 'Admin',
                tier: null,
                requirement: 1,
                current: 1,
                achieved: true,
                reward: {card: true},
                claimed: false,
            });
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
        const rewardPayloads = [];
        const messageParts = [];

        if (reward.packs) {
            user.packs = (user.packs || 0) + reward.packs;
            messageParts.push(`Added ${reward.packs} pack${reward.packs > 1 ? 's' : ''}`);
            rewardPayloads.push({ type: 'PACK', data: { amount: reward.packs }, message: `From Achievement: ${name}` });
        }
        if (reward.card) {
            const rewardCard = await generateCardWithProbability();
            if (!rewardCard) return res.status(500).json({message: 'Failed to generate card reward: no cards available'});
            rewardCard.acquiredAt = new Date();
            messageParts.push(`${rewardCard.name} (#${rewardCard.mintNumber}) [${rewardCard.rarity}]`);
            user.cards.push(rewardCard);
            rewardPayloads.push({ type: 'CARD', data: rewardCard, message: `From Achievement: ${name}` });
        }

        let titleUnlocked = null;
        const titleReward = reward.title || (reward.titleSlug ? { slug: reward.titleSlug } : null);
        if (titleReward && titleReward.slug) {
            const slug = String(titleReward.slug).trim().toLowerCase();
            if (slug) {
                let titleDoc = await Title.findOne({ slug });
                if (!titleDoc && titleReward.name) {
                    titleDoc = await Title.create({
                        name: titleReward.name,
                        slug,
                        description: titleReward.description || '',
                        color: titleReward.color || '',
                        gradient: titleReward.gradient || '',
                        isAnimated: Boolean(titleReward.isAnimated),
                        effect: titleReward.effect || '',
                    });
                }

                if (titleDoc) {
                    const alreadyUnlocked = (user.unlockedTitles || []).some(
                        (id) => id.toString() === titleDoc._id.toString()
                    );
                    if (!alreadyUnlocked) {
                        user.unlockedTitles.push(titleDoc._id);
                    }
                    titleUnlocked = {
                        _id: titleDoc._id,
                        name: titleDoc.name,
                        slug: titleDoc.slug,
                        description: titleDoc.description,
                        color: titleDoc.color,
                        gradient: titleDoc.gradient,
                        isAnimated: titleDoc.isAnimated,
                        effect: titleDoc.effect,
                    };
                    messageParts.push(`Unlocked title "${titleDoc.name}"`);
                }
            }
        }

        const achToUpdate = user.achievements.find(a => a.name === name);
        if (achToUpdate) achToUpdate.claimed = true;

        const message = messageParts.length ? messageParts.join(' | ') : 'Achievement reward claimed';
        await createLogEntry(user, 'ACHIEVEMENT_AWARDED', `${name} - ${message}`);

        await user.save();

        res.json({success: true, pendingRewards: rewardPayloads, titleUnlocked});

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
