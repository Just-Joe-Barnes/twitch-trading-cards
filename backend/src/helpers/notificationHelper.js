const Notification = require('../models/notificationModel');
// Import the specific function needed from notificationService
const { sendNotificationToUser } = require('../../notificationService');

const createNotification = async (userId, { type, message, link, extra = {} }) => {
    try {
        console.log('Creating notification for user:', userId, { type, message, link, extra });

        const notification = await Notification.create({
            userId,
            type,
            message,
            link,
            isRead: false,
            createdAt: new Date(),
            extra
        });

        sendNotificationToUser(userId, notification.toObject());
        console.log('Notification saved and real-time event sent to user:', userId);

    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};

module.exports = { createNotification };
