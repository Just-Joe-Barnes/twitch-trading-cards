const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAchievements, claimAchievementReward, clearPendingReward} = require('../controllers/achievementController');

router.get('/', protect, getAchievements);
router.post('/claim', protect, claimAchievementReward);
router.post('/clear-reward', protect, clearPendingReward);

module.exports = router;
