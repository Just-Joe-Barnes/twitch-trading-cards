// File: backend/src/routes/mintingLogRoutes.js

const express = require('express');
const MintingLog = require('../models/mintingLogModel');
const router = express.Router();

router.get('/logs', async (req, res) => {
    try {
        const logs = await MintingLog.find().populate('userId', 'username').sort({ timestamp: -1 });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching minting logs:', error);
        res.status(500).json({ error: 'Failed to fetch minting logs.' });
    }
});

module.exports = router;
