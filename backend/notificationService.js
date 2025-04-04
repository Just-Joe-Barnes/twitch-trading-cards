// File: backend/notificationService.js
let ioInstance = null;

function setSocketInstance(io) {
    ioInstance = io;
    console.log("[notificationService] Socket.io instance set.");
}

// Broadcast a notification event to all connected clients
function broadcastNotification(notification) {
    if (!ioInstance) {
        console.warn("[notificationService] No Socket.io instance available. Notification not broadcast.");
        return;
    }
    // Emit to everyone; if you need per-user emissions, modify this accordingly.
    ioInstance.emit("notification", notification);
    console.log("[notificationService] Broadcasted notification:", notification);
}

// Send a notification event to a specific user ID
function sendNotificationToUser(userId, notification) {
    if (!ioInstance) {
        console.warn("[notificationService] No Socket.io instance available. Notification not sent to user:", userId);
        return;
    }
    // Emit specifically to the room identified by the userId
    ioInstance.to(userId.toString()).emit("notification", notification);
    console.log(`[notificationService] Sent notification to user ${userId}:`, notification);
}

module.exports = {
    setSocketInstance,
    broadcastNotification,
    sendNotificationToUser, // Export the new function
};
