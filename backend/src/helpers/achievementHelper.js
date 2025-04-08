const checkAndGrantAchievements = async (user) => {
  const achievements = [];

  // Level milestones
  if (user.level >= 1 && !user.achievements.some(a => a.name === 'Level 1')) {
    achievements.push({ name: 'Level 1', description: 'Reached Level 1' });
  }
  if (user.level >= 5 && !user.achievements.some(a => a.name === 'Level 5')) {
    achievements.push({ name: 'Level 5', description: 'Reached Level 5' });
  }
  if (user.level >= 10 && !user.achievements.some(a => a.name === 'Level 10')) {
    achievements.push({ name: 'Level 10', description: 'Reached Level 10' });
  }
  if (user.level >= 20 && !user.achievements.some(a => a.name === 'Level 20')) {
    achievements.push({ name: 'Level 20', description: 'Reached Level 20' });
  }
  if (user.level >= 50 && !user.achievements.some(a => a.name === 'Level 50')) {
    achievements.push({ name: 'Level 50', description: 'Reached Level 50' });
  }

  // Trades completed
  if (user.completedTrades >= 10 && !user.achievements.some(a => a.name === 'Trader I')) {
    achievements.push({ name: 'Trader I', description: 'Completed 10 trades' });
  }
  if (user.completedTrades >= 50 && !user.achievements.some(a => a.name === 'Trader II')) {
    achievements.push({ name: 'Trader II', description: 'Completed 50 trades' });
  }

  // Listings created
  if (user.createdListings >= 10 && !user.achievements.some(a => a.name === 'Seller I')) {
    achievements.push({ name: 'Seller I', description: 'Created 10 listings' });
  }
  if (user.createdListings >= 50 && !user.achievements.some(a => a.name === 'Seller II')) {
    achievements.push({ name: 'Seller II', description: 'Created 50 listings' });
  }

  // Packs opened (retroactive)
  const openedPacksCount = user.openedPacks || 0;
  if (openedPacksCount >= 10 && !user.achievements.some(a => a.name === 'Opener I')) {
    achievements.push({ name: 'Opener I', description: 'Opened 10 packs' });
  }
  if (openedPacksCount >= 50 && !user.achievements.some(a => a.name === 'Opener II')) {
    achievements.push({ name: 'Opener II', description: 'Opened 50 packs' });
  }

  if (achievements.length > 0) {
    console.log(`Granting ${achievements.length} achievements to user ${user.username}`);
    achievements.forEach(a => console.log(`- ${a.name}`));

    user.achievements.push(...achievements.map(a => ({ ...a, dateEarned: new Date() })));
    await user.save();

    const { sendNotificationToUser } = require('../../notificationService');
    for (const a of achievements) {
      sendNotificationToUser(user._id, {
        type: 'Achievement Unlocked',
        message: `You unlocked "${a.name}"!`,
        link: '/profile',
      });
    }
  } else {
    console.log(`No new achievements for user ${user.username}`);
  }
};

module.exports = { checkAndGrantAchievements };
