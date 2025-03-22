// notificationService.js
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
    // This emits to everyone. If you want per-user logic, you can do .to(userId).emit(...) instead.
    ioInstance.emit("notification", notification);
    console.log("[notificationService] Broadcasted notification:", notification);
}

module.exports = {
    setSocketInstance,
    broadcastNotification,
};
