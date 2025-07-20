const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { startGrading, completeGrading, revealGradedCard } = require('../controllers/gradingController');

const router = express.Router();

router.post('/grade-card', protect, startGrading);
router.post('/grade-card/complete', protect, completeGrading);
router.post('/grade-card/reveal', protect, revealGradedCard);

module.exports = router;
