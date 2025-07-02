const User = require('../models/userModel');
const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const ACHIEVEMENTS = require('../data/achievements');
const ALL_RARITIES = ['Basic','Common','Standard','Uncommon','Rare','Epic','Legendary','Mythic','Unique','Divine'];

const getAchievements = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

  // Count completed trades and created listings
  const [tradeCount, listingCount] = await Promise.all([
      Trade.countDocuments({
        $or: [{ sender: user._id }, { recipient: user._id }],
        status: 'accepted'
      }),
      MarketListing.countDocuments({ owner: user._id })
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

    const achievements = ACHIEVEMENTS.map(a => {
      let current = 0;
      if (a.type === 'level') current = user.level || 0;
      if (a.type === 'packs') current = user.openedPacks || 0;
      if (a.type === 'trades') current = tradeCount;
      if (a.type === 'listings') current = listingCount;
      if (a.type === 'sales') current = user.completedListings || 0;
      if (a.type === 'uniqueCards') current = uniqueCards;
      if (a.type === 'fullSets') current = fullSets;
      if (a.type === 'logins') current = user.loginCount || 0;
      const achieved = current >= a.requirement;
      return {
        name: a.name,
        description: a.description,
        requirement: a.requirement,
        current: Math.min(current, a.requirement),
        achieved
      };
    });

    res.json({ achievements });
  } catch (err) {
    console.error('Error fetching achievements:', err.message);
    res.status(500).json({ message: 'Failed to fetch achievements' });
  }
};

module.exports = { getAchievements };
