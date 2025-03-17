// In a temporary file (e.g., src/routes/testNotificationRoutes.js)
const express = require('express');
const router = express.Router();
const { sendNotification } = require('../../server'); // adjust path as needed

// This route triggers a test notification for the logged-in user.
// For example: GET /api/test-notification?userId=<id>
router.get('/test-notification', (req, res) => {
    const { userId } = req.query;
    if (!userId) {
        return res.status(400).json({ message: 'Missing userId query parameter' });
    }
    const sampleNotification = {
        type: 'test',
        message: 'This is a test notification.',
        link: '/dashboard', // or any route you want to test
        isRead: false,
        extra: { priority: 'high' }
    };
    sendNotification(userId, sampleNotification);
    res.json({ message: 'Test notification sent.' });
});

module.exports = router;
