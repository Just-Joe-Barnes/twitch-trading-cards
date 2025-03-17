// /src/routes/testNotificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel');
const { sendNotification } = require('../../notificationService'); // Updated path to notificationService

// GET /api/test-notification
// This route creates a test notification for the logged-in user.
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.id; // from the JWT
        if (!userId) {
            return res.status(400).json({ message: 'User ID not found in token.' });
        }

        // Create a sample notification
        const sampleNotification = {
            type: 'test',
            message: 'This is a test notification!',
            link: '/dashboard',  // or any relevant route
            isRead: false,
            extra: { priority: 'high' }
        };

        // 1) Insert into DB
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.notifications.push(sampleNotification);
        await user.save();

        // 2) Send real-time notification
        sendNotification(userId, sampleNotification);

        // 3) Return a JSON response
        res.json({
            message: 'Test notification created and sent!',
            notification: sampleNotification,
        });
    } catch (error) {
        console.error('Error creating test notification:', error);
        res.status(500).json({ message: 'Error creating test notification' });
    }
});

module.exports = router;
