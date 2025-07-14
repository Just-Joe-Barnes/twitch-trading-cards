const express = require('express');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const { gradeCard } = require('../controllers/gradingController');

const router = express.Router();

router.post('/grade-card', protect, adminOnly, gradeCard);

module.exports = router;
