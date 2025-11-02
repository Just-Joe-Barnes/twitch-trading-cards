const express = require('express');
const router = express.Router();
const PeriodCounter = require('../models/periodCounterModel');
const { protect, adminOnly} = require('../middleware/authMiddleware');
const { updatePeriodCounters } = require('../services/periodCounterService');
const {getWeeklyKey, getMonthlyKey} = require("../scripts/periods");

router.get('/stats', protect, async (req, res) => {
    try {
        const wk = getWeeklyKey().periodKey;
        const mk = getMonthlyKey().periodKey;

        const [weeklyDoc, monthlyDoc] = await Promise.all([
            PeriodCounter.findOne({ scope: 'weekly', periodKey: wk }).lean(),
            PeriodCounter.findOne({ scope: 'monthly', periodKey: mk }).lean(),
        ]);

        res.json({
            timezone: 'Europe/London',
            weekly: {
                periodKey: wk,
                count: weeklyDoc?.count ?? 0
            },
            monthly: {
                periodKey: mk,
                count: monthlyDoc?.count ?? 0,
                activeUsers: monthlyDoc?.activeUserIds?.length ?? 0
            },
        });

    } catch (error) {
        console.error('Failed to fetch community stats:', error);
        res.status(500).json({ message: 'Failed to fetch community stats' });
    }
});

module.exports = router;

