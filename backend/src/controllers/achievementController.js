const User = require('../models/userModel');
const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const ACHIEVEMENTS = require('../../../config/achievements');
const { generateCardWithProbability } = require('../helpers/cardHelpers');
const ALL_RARITIES = ['Basic','Common','Standard','Uncommon','Rare','Epic','Legendary','Mythic','Unique','Divine'];

const getAchievements = async (req, res) => {
  try {
    const userDoc = await User.findById(req.user._id);
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Ensure any newly met achievements are granted
    const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
    await checkAndGrantAchievements(userDoc);

    const user = userDoc.toObject();

  // Count completed trades and sold listings
  const [tradeCount, listingCount] = await Promise.all([
      Trade.countDocuments({
        $or: [{ sender: user._id }, { recipient: user._id }],
        status: 'accepted'
      }),
      MarketListing.countDocuments({ owner: user._id, status: 'sold' })
    ]);

  const uniqueCards = new Set((user.cards || []).map(c => c.name)).size;

  const byName = {};
  (user.cards || []).forEach(c => {
    if (!byName[c.name]) byName[c.name] = new Set();
    byName[c.name].add(c.rarity);
  });
  let fullSets = 0;
  for (const rarities of Object.values(byName)) {
    if (ALL_RARITIES.every(r => rarities.has(r))) fullSets += 1;
  }

  const featuredCount = (user.featuredCards || []).length;
  const modifierCards = (user.cards || []).filter(c => c.modifier).length;
  const raritiesOwned = new Set((user.cards || []).map(c => c.rarity)).size;

  const hasModifierCard = (user.cards || []).some(c => c.modifier);
  const hasLegendaryCard = (user.cards || []).some(c =>
    ['Legendary', 'Mythic', 'Unique', 'Divine'].includes(c.rarity)
  );

    const achievements = ACHIEVEMENTS.map(a => {
      let current = 0;
      if (a.field === 'completedTrades') current = tradeCount;
      else if (a.field === 'completedListings') current = listingCount;
      else if (a.field === 'uniqueCards') current = uniqueCards;
      else if (a.field === 'fullSets') current = fullSets;
      else if (a.field === 'hasModifierCard') current = hasModifierCard ? 1 : 0;
      else if (a.field === 'hasLegendaryCard') current = hasLegendaryCard ? 1 : 0;
      else if (a.field === 'favoriteCard') current = user.favoriteCard ? 1 : 0;
      else if (a.field === 'featuredCardsCount') current = featuredCount;
      else if (a.field === 'modifierCards') current = modifierCards;
      else if (a.field === 'raritiesOwned') current = raritiesOwned;
      else current = user[a.field] || 0;
      const achieved = current >= a.threshold;
      const userAch = user.achievements?.find(ua => ua.name === a.name);
      return {
        name: a.name,
        description: a.description,
        requirement: a.threshold,
        current: Math.min(current, a.threshold),
        achieved,
        reward: a.reward || {},
        ...(userAch ? { dateEarned: userAch.dateEarned, claimed: userAch.claimed } : { claimed: false })
      };
    });

    if (user.isAdmin) {
      achievements.push(
        {
          name: 'Debug: Free Pack',
          description: 'Admin only - grants one pack',
          requirement: 1,
          current: 1,
          achieved: true,
          reward: { packs: 1 },
          claimed: false,
        },
        {
          name: 'Debug: Random Card',
          description: 'Admin only - grants a random card',
          requirement: 1,
          current: 1,
          achieved: true,
          reward: { card: true },
          claimed: false,
        },
      );
    }

    res.json({ achievements });
  } catch (err) {
    console.error('Error fetching achievements:', err.message);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
};

const claimAchievementReward = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Achievement name required' });
    }

    // Debug achievements - admin only and repeatable
    if (name === 'Debug: Free Pack' || name === 'Debug: Random Card') {
      const user = await User.findById(req.user._id);
      if (!user || !user.isAdmin) {
        return res.status(403).json({ message: 'Admin only' });
      }
      let rewardCard = null;
      if (name === 'Debug: Free Pack') {
        user.packs = (user.packs || 0) + 1;
      } else {
        rewardCard = await generateCardWithProbability();
        if (rewardCard) {
          rewardCard.acquiredAt = new Date();
          user.cards.push(rewardCard);
        }
      }
      await user.save();
      return res.json({ success: true, packs: user.packs, card: rewardCard });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { checkAndGrantAchievements } = require('../helpers/achievementHelper');
    await checkAndGrantAchievements(user);

    const ach = user.achievements.find(a => a.name === name);
    if (!ach) return res.status(400).json({ message: 'Achievement not unlocked' });
    if (ach.claimed) return res.status(400).json({ message: 'Reward already claimed' });

    const reward = ach.reward || {};
    let rewardCard = null;
    if (reward.packs) {
      user.packs = (user.packs || 0) + reward.packs;
    }
    if (reward.card) {
      rewardCard = await generateCardWithProbability();
      if (!rewardCard) {
        return res.status(500).json({ message: 'Failed to generate card reward: no cards available' });
      }
      rewardCard.acquiredAt = new Date();
      user.cards.push(rewardCard);
    }

    ach.claimed = true;
    await user.save();

    res.json({ success: true, packs: user.packs, card: rewardCard });
  } catch (err) {
    console.error('Error claiming achievement:', err.message);
    res.status(500).json({ message: 'Failed to claim achievement reward' });
  }
};

module.exports = { getAchievements, claimAchievementReward };
