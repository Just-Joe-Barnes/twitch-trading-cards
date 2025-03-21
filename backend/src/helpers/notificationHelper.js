const User = require('../models/userModel');

const createNotification = async (userId, { type, message, link, extra = {} }) => {
    try {
        console.log('Creating notification for user:', userId, { type, message, link, extra });
        await User.findByIdAndUpdate(
            userId,
            {
                $push: {
                    notifications: {
                        type,
                        message,
                        link,
                        isRead: false,
                        createdAt: new Date(),
                        extra
                    }
                }
            },
            { new: true }
        );
    } catch (error) {
        console.error('Error creating notification:', error.message);
    }
};


module.exports = { createNotification };
