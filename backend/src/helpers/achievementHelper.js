const achievementsConfig = require('../../../config/achievements');
const Trade = require('../models/tradeModel');
const MarketListing = require('../models/MarketListing');
const ALL_RARITIES = ['Basic','Common','Standard','Uncommon','Rare','Epic','Legendary','Mythic','Unique','Divine'];

const checkAndGrantAchievements = async (user) => {
  const newlyUnlocked = [];
  const progressMap = {};

  const uniqueCards = new Set((user.cards || []).map(c => c.name)).size;
  const setsByName = {};
  (user.cards || []).forEach(card => {
    if (!setsByName[card.name]) setsByName[card.name] = new Set();
    setsByName[card.name].add(card.rarity);
  });
  let fullSets = 0;
  for (const rarities of Object.values(setsByName)) {
    if (ALL_RARITIES.every(r => rarities.has(r))) fullSets += 1;
  }

  const featuredCount = (user.featuredCards || []).length;
  const modifierCards = (user.cards || []).filter(c => c.modifier).length;
  const raritiesOwned = new Set((user.cards || []).map(c => c.rarity)).size;

  const hasModifierCard = (user.cards || []).some(c => c.modifier);
  const hasLegendaryCard = (user.cards || []).some(c =>
    ['Legendary', 'Mythic', 'Unique', 'Divine'].includes(c.rarity)
  );

  const [tradeCount, listingCount] = await Promise.all([
    Trade.countDocuments({
      $or: [{ sender: user._id }, { recipient: user._id }],
      status: 'accepted',
    }),
    MarketListing.countDocuments({ owner: user._id, status: 'sold' }),
  ]);

  for (const achievement of achievementsConfig) {
    let progress = 0;
    if (achievement.field === 'uniqueCards') progress = uniqueCards;
    else if (achievement.field === 'fullSets') progress = fullSets;
    else if (achievement.field === 'completedTrades') progress = tradeCount;
    else if (achievement.field === 'completedListings') progress = listingCount;
    else if (achievement.field === 'hasModifierCard') progress = hasModifierCard ? 1 : 0;
    else if (achievement.field === 'hasLegendaryCard') progress = hasLegendaryCard ? 1 : 0;
    else if (achievement.field === 'favoriteCard') progress = user.favoriteCard ? 1 : 0;
    else if (achievement.field === 'featuredCardsCount') progress = featuredCount;
    else if (achievement.field === 'modifierCards') progress = modifierCards;
    else if (achievement.field === 'raritiesOwned') progress = raritiesOwned;
    else progress = user[achievement.field] || 0;
    const alreadyHas = user.achievements.some(a => a.name === achievement.name);

    progressMap[achievement.key] = {
      current: progress,
      threshold: achievement.threshold,
      unlocked: progress >= achievement.threshold,
    };

    if (progress >= achievement.threshold && !alreadyHas) {
      newlyUnlocked.push({
        name: achievement.name,
        description: achievement.description,
        reward: achievement.reward || {}
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    console.log(`Granting ${newlyUnlocked.length} achievements to user ${user.username}`);
    newlyUnlocked.forEach(a => console.log(`- ${a.name}`));

    user.achievements.push(
      ...newlyUnlocked.map(a => ({
        name: a.name,
        description: a.description,
        reward: a.reward || {},
        claimed: false,
        dateEarned: new Date(),
      }))
    );
    await user.save();

    const { sendNotificationToUser } = require('../../notificationService');
    for (const a of newlyUnlocked) {
      sendNotificationToUser(user._id, {
        type: 'Achievement Unlocked',
        message: `You unlocked "${a.name}"! Claim your reward on the Achievements page.`,
        link: '/achievements',
      });
    }
  } else {
    console.log(`No new achievements for user ${user.username}`);
  }

  return progressMap;
};

module.exports = { checkAndGrantAchievements };
