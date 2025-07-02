const achievementsConfig = require('../../../config/achievements');

const checkAndGrantAchievements = async (user) => {
  const newlyUnlocked = [];
  const progressMap = {};

  for (const achievement of achievementsConfig) {
    const progress = user[achievement.field] || 0;
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
