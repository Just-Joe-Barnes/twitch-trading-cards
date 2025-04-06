const checkAndGrantAchievements = async (user) => {
  const achievements = [];

  // XP milestones
  if (user.xp >= 100 && !user.achievements.some(a => a.name === 'XP 100')) {
    achievements.push({ name: 'XP 100', description: 'Earned 100 XP' });
  }
  if (user.xp >= 500 && !user.achievements.some(a => a.name === 'XP 500')) {
    achievements.push({ name: 'XP 500', description: 'Earned 500 XP' });
  }
  if (user.xp >= 1000 && !user.achievements.some(a => a.name === 'XP 1000')) {
    achievements.push({ name: 'XP 1000', description: 'Earned 1000 XP' });
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

  // Packs opened
  if (user.openedPacks >= 10 && !user.achievements.some(a => a.name === 'Opener I')) {
    achievements.push({ name: 'Opener I', description: 'Opened 10 packs' });
  }
  if (user.openedPacks >= 50 && !user.achievements.some(a => a.name === 'Opener II')) {
    achievements.push({ name: 'Opener II', description: 'Opened 50 packs' });
  }

  if (achievements.length > 0) {
    user.achievements.push(...achievements.map(a => ({ ...a, dateEarned: new Date() })));
    await user.save();
  }
};

module.exports = { checkAndGrantAchievements };
