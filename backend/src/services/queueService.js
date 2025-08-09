let ioInstance = null;
const packQueue = [];
let isOverlayBusy = false;

const initializeQueueService = (io) => {
    ioInstance = io;
    console.log('[QueueService] Initialized.');
};

const processQueue = () => {
    if (isOverlayBusy) {
        console.log(`[QueueService] SKIPPING PROCESS: Overlay is busy. Queue size: ${packQueue.length}`);
        return;
    }
    if (packQueue.length === 0) {
        console.log('[QueueService] SKIPPING PROCESS: Queue is empty.');
        return;
    }

    isOverlayBusy = true;
    console.log(`[QueueService] LOCK ACQUIRED. Overlay is now BUSY.`);

    const nextJob = packQueue.shift();
    const streamerUserId = nextJob.streamerDbId;

    if (ioInstance) {
        ioInstance.to(streamerUserId).emit('new-pack-opening', {
            cards: nextJob.cards,
            username: nextJob.redeemer.username
        });

        const queueUsernames = packQueue.map(job => job.redeemer.username);
        ioInstance.to(streamerUserId).emit('queue-updated', queueUsernames);

        console.log(`[QueueService] > Sent pack to ${nextJob.redeemer.username}. Remaining queue: ${packQueue.length}`);
    }
};

const addToQueue = (job) => {
    packQueue.push(job);
    console.log(`[QueueService] Added ${job.redeemer.username} to queue. New queue size: ${packQueue.length}`);

    if (ioInstance) {
        const streamerUserId = job.streamerDbId;
        const queueUsernames = packQueue.map(j => j.redeemer.username);
        ioInstance.to(streamerUserId).emit('queue-updated', queueUsernames);
    }

    processQueue();
};

const markAsReady = (socketId) => {
    console.log(`[QueueService] Signal from socket ${socketId}: Overlay is READY.`);
    isOverlayBusy = false;

    // Use a small timeout to allow the current execution stack to clear before processing the next item.
    // This helps prevent race conditions where events arrive in very rapid succession.
    setTimeout(processQueue, 100);
};

module.exports = {
    initializeQueueService,
    addToQueue,
    markAsReady,
};
