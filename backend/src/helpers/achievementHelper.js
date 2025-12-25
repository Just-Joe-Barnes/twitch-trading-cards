const achievementsConfig = require('../../../config/achievements');
const { buildAchievementProgressMap } = require('./achievementProgress');

const checkAndGrantAchievements = async (user, progressMapOverride = null) => {
  const newlyUnlocked = [];
  const progressMap = progressMapOverride
    ? progressMapOverride
    : (await buildAchievementProgressMap(user, achievementsConfig)).progressMap;

  for (const achievement of achievementsConfig) {
    const key = achievement.key || achievement.name;
    const progressEntry = progressMap[key] || {
      current: user[achievement.field] || 0,
      threshold: achievement.threshold,
      unlocked: false,
    };
    const progress = progressEntry.current || 0;
    const alreadyHas = user.achievements.some((a) => a.name === achievement.name);

    if (progress >= achievement.threshold && !alreadyHas) {
      newlyUnlocked.push({
        name: achievement.name,
        description: achievement.description,
        reward: achievement.reward || {},
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    console.log(`Granting ${newlyUnlocked.length} achievements to user ${user.username}`);
    newlyUnlocked.forEach((a) => console.log(`- ${a.name}`));

    user.achievements.push(
      ...newlyUnlocked.map((a) => ({
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
