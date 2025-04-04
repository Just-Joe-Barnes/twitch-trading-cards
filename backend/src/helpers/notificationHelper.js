const User = require('../models/userModel');
// Import the specific function needed from notificationService
const { sendNotificationToUser } = require('../../notificationService'); // Adjust path as needed

const createNotification = async (userId, { type, message, link, extra = {} }) => {
    try {
        console.log('Creating notification for user:', userId, { type, message, link, extra });

        // Prepare the notification object first
        // Note: MongoDB will automatically add an _id when this is pushed to the array
        const notificationData = {
            type,
            message,
            link,
            isRead: false,
            createdAt: new Date(),
            extra
        };

        // Save notification to the database and get the updated user
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $push: { notifications: notificationData } },
            { new: true } // `new: true` returns the modified document
        ).populate('notifications'); // Populate the notifications array

        if (updatedUser) {
            // If saving was successful, send the real-time notification via Socket.IO
            // The new notification is the last one in the array
            const savedNotification = updatedUser.notifications[updatedUser.notifications.length - 1];
            sendNotificationToUser(userId, savedNotification); // Send the actual saved notification object
            console.log('Notification saved and real-time event sent to user:', userId);
        } else {
            console.error('Failed to find user to update notification for:', userId);
        }

    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};

module.exports = { createNotification };
