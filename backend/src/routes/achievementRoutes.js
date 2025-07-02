const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getAchievements, claimAchievementReward } = require('../controllers/achievementController');

router.get('/', protect, getAchievements);
router.post('/claim', protect, claimAchievementReward);

module.exports = router;
