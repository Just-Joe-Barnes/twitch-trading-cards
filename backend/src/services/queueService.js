let ioInstance = null;
const packQueue = [];
let isOverlayBusy = false;
let isQueuePaused = true; // NEW: The queue will now start in a PAUSED state.

const initializeQueueService = (io) => {
    ioInstance = io;
    console.log('[QueueService] Initialized. Queue is PAUSED by default.');
};

const processQueue = () => {
    // UPDATED: Now checks the paused flag first.
    if (isQueuePaused || isOverlayBusy || packQueue.length === 0) {
        console.log(`[QueueService] SKIPPING PROCESS: Paused: ${isQueuePaused}, Busy: ${isOverlayBusy}, Queue Size: ${packQueue.length}`);
        return;
    }

    isOverlayBusy = true;
    console.log(`[QueueService] LOCK ACQUIRED. Overlay is now BUSY.`);

    const nextJob = packQueue.shift();
    const streamerUserId = nextJob.streamerDbId;

    const room = ioInstance.sockets.adapter.rooms.get(streamerUserId);
    if (!room || room.size === 0) {
        console.log(`[QueueService] No clients in room ${streamerUserId}. Re-queueing job and pausing.`);
        packQueue.unshift(nextJob);
        isOverlayBusy = false;
        console.log(`[QueueService] LOCK RELEASED. Waiting for client to connect.`);
        return;
    }

    ioInstance.to(streamerUserId).emit('new-pack-opening', {
        cards: nextJob.cards,
        username: nextJob.redeemer.username
    });

    const queueUsernames = packQueue.map(job => job.redeemer.username);
    ioInstance.to(streamerUserId).emit('queue-updated', queueUsernames);

    console.log(`[QueueService] > Sent pack to ${nextJob.redeemer.username}. Remaining queue: ${packQueue.length}`);
};

const addToQueue = (job) => {
    packQueue.push(job);
    console.log(`[QueueService] Added ${job.redeemer.username} to queue. New queue size: ${packQueue.length}`);

    if (ioInstance) {
        const streamerUserId = job.streamerDbId;
        const queueUsernames = packQueue.map(j => j.redeemer.username);
        ioInstance.to(streamerUserId).emit('queue-updated', queueUsernames);
    }

    // REMOVED: No longer automatically processes the queue when an item is added.
    // processQueue();
};

const markAsReady = (socketId) => {
    console.log(`[QueueService] Signal from socket ${socketId}: Overlay is READY.`);
    isOverlayBusy = false;
    setTimeout(processQueue, 100);
};

// NEW: Functions to control the paused state
const pauseQueue = () => {
    console.log('[QueueService] Queue has been PAUSED by an admin.');
    isQueuePaused = true;
};

const resumeQueue = () => {
    console.log('[QueueService] Queue has been RESUMED by an admin.');
    isQueuePaused = false;
    processQueue(); // Immediately try to process the queue
};

const getStatus = () => {
    return {
        isBusy: isOverlayBusy,
        isPaused: isQueuePaused, // <-- NEW: Include the paused status
        queue: packQueue.map(job => job.redeemer.username),
    };
};

module.exports = {
    initializeQueueService,
    addToQueue,
    markAsReady,
    getStatus,
    processQueue,
    pauseQueue,   // <-- Export new function
    resumeQueue,  // <-- Export new function
};
