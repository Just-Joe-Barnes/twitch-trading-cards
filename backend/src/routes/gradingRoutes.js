const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { startGrading, completeGrading } = require('../controllers/gradingController');

const router = express.Router();

router.post('/grade-card', protect, adminOnly, startGrading);
router.post('/grade-card/complete', protect, adminOnly, completeGrading);

module.exports = router;
