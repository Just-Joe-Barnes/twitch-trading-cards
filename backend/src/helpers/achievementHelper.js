const achievementsConfig = require('../../../config/achievements');
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

  for (const achievement of achievementsConfig) {
    let progress = 0;
    if (achievement.field === 'uniqueCards') progress = uniqueCards;
    else if (achievement.field === 'fullSets') progress = fullSets;
    else progress = user[achievement.field] || 0;
    const alreadyHas = user.achievements.some(a => a.name === achievement.name);

    progressMap[achievement.key] = {
      current: progress,
      threshold: achievement.threshold,
      unlocked: progress >= achievement.threshold,
    };

    if (progress >= achievement.threshold && !alreadyHas) {
      newlyUnlocked.push({ name: achievement.name, description: achievement.description });
    }
  }

  if (newlyUnlocked.length > 0) {
    console.log(`Granting ${newlyUnlocked.length} achievements to user ${user.username}`);
    newlyUnlocked.forEach(a => console.log(`- ${a.name}`));

    user.achievements.push(...newlyUnlocked.map(a => ({ ...a, dateEarned: new Date() })));
    await user.save();

    const { sendNotificationToUser } = require('../../notificationService');
    for (const a of newlyUnlocked) {
      sendNotificationToUser(user._id, {
        type: 'Achievement Unlocked',
        message: `You unlocked "${a.name}"!`,
        link: '/profile',
      });
    }
  } else {
    console.log(`No new achievements for user ${user.username}`);
  }

  return progressMap;
};

module.exports = { checkAndGrantAchievements };
