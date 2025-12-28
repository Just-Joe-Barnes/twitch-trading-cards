const achievementsConfig = require('../../../config/achievements');
const { buildAchievementProgressMap } = require('./achievementProgress');
const Title = require('../models/titleModel');

const normalizeTitleReward = (reward = {}) => {
  const direct = reward.title || (reward.titleSlug ? { slug: reward.titleSlug } : null);
  if (!direct?.slug) return null;
  const slug = String(direct.slug).trim().toLowerCase();
  if (!slug) return null;
  return {
    name: direct.name || '',
    slug,
    description: direct.description || '',
    color: direct.color || '',
    gradient: direct.gradient || '',
    isAnimated: Boolean(direct.isAnimated),
    effect: direct.effect || '',
  };
};

const backfillAchievementTitles = async (user) => {
  if (!user?.achievements?.length) return false;

  let updated = false;
  const titleCache = new Map();

  for (const achievement of achievementsConfig) {
    const titleReward = normalizeTitleReward(achievement.reward || {});
    if (!titleReward) continue;

    const userAch = user.achievements.find((a) => a.name === achievement.name);
    if (!userAch) continue;

    const reward = userAch.reward || {};
    const rewardTitleSlug = reward.title?.slug ? String(reward.title.slug).trim() : '';
    if (!rewardTitleSlug) {
      userAch.reward = {
        ...reward,
        title: { ...titleReward },
      };
      updated = true;
    }

    if (!userAch.claimed) continue;

    if (!Array.isArray(user.unlockedTitles)) {
      user.unlockedTitles = [];
    }

    let titleDoc = titleCache.get(titleReward.slug);
    if (titleDoc === undefined) {
      titleDoc = await Title.findOne({ slug: titleReward.slug });
      if (!titleDoc && titleReward.name) {
        titleDoc = await Title.create({
          name: titleReward.name,
          slug: titleReward.slug,
          description: titleReward.description || '',
          color: titleReward.color || '',
          gradient: titleReward.gradient || '',
          isAnimated: Boolean(titleReward.isAnimated),
          effect: titleReward.effect || '',
        });
      }
      titleCache.set(titleReward.slug, titleDoc || null);
    }

    if (titleDoc) {
      const alreadyUnlocked = user.unlockedTitles.some(
        (id) => id.toString() === titleDoc._id.toString()
      );
      if (!alreadyUnlocked) {
        user.unlockedTitles.push(titleDoc._id);
        updated = true;
      }
    }
  }

  return updated;
};

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

  const didBackfill = await backfillAchievementTitles(user);

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
  }

  if (newlyUnlocked.length > 0 || didBackfill) {
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
