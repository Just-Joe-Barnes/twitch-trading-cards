// /notificationService.js

let ioInstance = null;

// Setter to initialize the Socket.io instance
const setSocketInstance = (io) => {
    ioInstance = io;
};

const sendNotification = (userId, notification) => {
    if (!ioInstance) {
        console.error('Socket.io instance not set!');
        return;
    }
    console.log(`Sending notification to user: ${userId}`);
    ioInstance.to(userId).emit('newNotification', notification);
};

module.exports = { setSocketInstance, sendNotification };
