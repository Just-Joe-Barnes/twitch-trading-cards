const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', authMiddleware, (req, res) => {
    res.status(200).json({ message: `Welcome to your dashboard, user ID: ${req.userId}` });
});

module.exports = router;
