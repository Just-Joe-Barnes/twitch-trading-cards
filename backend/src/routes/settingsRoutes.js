// server/routes/settingsRoutes.js

const express = require('express');
const router = express.Router();
const Setting = require('../models/settingsModel');

// GET /api/settings/maintenance
// Fetches the current maintenance status.
router.get('/maintenance', async (req, res) => {
    try {
        const maintenanceSetting = await Setting.findOne({ key: 'maintenanceMode' });
        // Default to 'false' if the setting somehow doesn't exist
        const status = maintenanceSetting ? maintenanceSetting.value : false;
        res.json({ maintenanceMode: status });
    } catch (error) {
        console.error('Error fetching maintenance status:', error);
        res.status(500).json({ message: 'Server error while fetching settings.' });
    }
});

module.exports = router;
