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

/**
 * Broadcasts a custom event with any data to a specific user's room.
 * @param {string} userId - The user's database ID.
 * @param {string} eventName - The name of the event to emit (e.g., 'new-pack-opening').
 * @param {object} data - The payload/data to send with the event.
 */
const broadcastToUser = (userId, eventName, data) => {
    if (ioInstance) {
        ioInstance.to(userId.toString()).emit(eventName, data);
    } else {
        console.warn(`[notificationService] No Socket.io instance available. Event "${eventName}" not sent.`);
    }
};

module.exports = {
    setSocketInstance,
    broadcastNotification,
    sendNotificationToUser,
    broadcastToUser,
    get io() { return ioInstance; }
};
