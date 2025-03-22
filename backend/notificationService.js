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

module.exports = {
    setSocketInstance,
    broadcastNotification,
};
