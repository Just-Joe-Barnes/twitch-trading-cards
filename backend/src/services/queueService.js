let ioInstance = null;
let overlaySocketMapInstance = null;
let isOverlayBusy = false;
let isQueuePaused = true;
let busyForStreamerId = null;

const QueuedPack = require('../models/queuedPackModel');
const { openPackForUserLogic } = require('../helpers/packHelpers');
const { createLogEntry } = require('../utils/logService');
const User = require("../models/userModel");

const initializeQueueService = (io, overlaySocketMap) => {
    ioInstance = io;
    overlaySocketMapInstance = overlaySocketMap;
    console.log('[QueueService] Initialized (DB). Queue is PAUSED by default.');
};

const broadcastQueueUpdate = async (streamerDbId) => {
    try {
        const jobs = await QueuedPack.find({ streamerDbId })
            .populate('redeemer', 'username')
            .sort({ createdAt: 'asc' });

        const queueUsernames = jobs.map(j => j.redeemer.username);
        ioInstance.to(streamerDbId).emit('queue-updated', queueUsernames);
        return queueUsernames;
    } catch (error) {
        console.error('[QueueService] Error broadcasting queue update:', error);
    }
};

const processQueue = async () => {
    if (isQueuePaused || isOverlayBusy) {
        console.log(`[QueueService] SKIPPING PROCESS: Paused: ${isQueuePaused}, Busy: ${isOverlayBusy}`);
        return;
    }

    const connectedStreamerIds = Array.from(overlaySocketMapInstance.keys());
    if (connectedStreamerIds.length === 0) {
        console.log('[QueueService] No overlays connected. Waiting.');
        return;
    }

    const nextJob = await QueuedPack.findOne({ streamerDbId: { $in: connectedStreamerIds } })
        .sort({ createdAt: 'asc' })
        .populate({
            path: 'redeemer',
            select: 'username selectedTitle',
            populate: { path: 'selectedTitle', select: 'name color gradient isAnimated effect' }
        });

    if (!nextJob) {
        console.log('[QueueService] No jobs in DB queue for any connected streamers.');
        return;
    }

    isOverlayBusy = true;
    busyForStreamerId = nextJob.streamerDbId;
    console.log(`[QueueService] LOCK ACQUIRED for ${busyForStreamerId}. Processing job ${nextJob._id}.`);

    const { streamerDbId, redeemer, templateId } = nextJob;

    const overlaySocketId = overlaySocketMapInstance.get(streamerDbId);
    const room = ioInstance.sockets.adapter.rooms.get(streamerDbId);
    const overlaySocket = overlaySocketId ? ioInstance.sockets.sockets.get(overlaySocketId) : null;

    if (!overlaySocket || !room || !room.has(overlaySocketId)) {
        console.log(`[QueueService] Overlay socket for ${streamerDbId} is not connected. Pausing.`);
        isOverlayBusy = false;
        busyForStreamerId = null;
        console.log(`[QueueService] LOCK RELEASED. Waiting for overlay to connect.`);
        pauseQueue();
        return;
    }

    try {
        if (!redeemer) {
            await createLogEntry(streamerUser, 'ERROR_TWITCH_ROUTE_REDEMPTION', `User with Twitch ID ${userId} not found.`);
            return res.status(404).json({ message: `User with Twitch ID ${userId} not found.` });
        }

        await User.findByIdAndUpdate(redeemer._id, {
            $inc: { packs: 1 }
        });

        const { newCards } = await openPackForUserLogic(redeemer._id, templateId, false);

        ioInstance.to(streamerDbId).emit('new-pack-opening', {
            cards: newCards,
            username: redeemer.username,
            title: redeemer.selectedTitle || null
        });

        await QueuedPack.findByIdAndDelete(nextJob._id);
        console.log(`[QueueService] > Sent pack to ${redeemer.username}. Job ${nextJob._id} deleted.`);

        broadcastQueueUpdate(streamerDbId);

    } catch (error) {
        console.error(`[QueueService] Error in openPackForUserLogic for ${redeemer.username}:`, error.message);
        await createLogEntry(null, 'ERROR_QUEUE_PROCESS', `Failed to open pack for ${redeemer.username}: ${error.message}`);
        markAsReady(null);
    }
};

const addToQueue = async (job) => {
    try {
        const { streamerDbId, redeemer, templateId } = job;
        await QueuedPack.create({
            streamerDbId,
            redeemer: redeemer._id,
            templateId
        });
        console.log(`[QueueService] Added ${redeemer.username} to DB queue.`);

        broadcastQueueUpdate(streamerDbId);
        processQueue();
    } catch (error) {
        console.error('[QueueService] Error adding to queue:', error);
    }
};

const markAsReady = (socketId) => {
    console.log(`[QueueService] Signal from socket ${socketId || 'system'}: Overlay is READY.`);
    isOverlayBusy = false;
    busyForStreamerId = null;

    if (!isQueuePaused) {
        setTimeout(processQueue, 100);
    }
};

const pauseQueue = () => {
    console.log('[QueueService] Queue has been PAUSED.');
    isQueuePaused = true;
};

const resumeQueue = () => {
    console.log('[QueueService] Queue has been RESUMED.');
    isQueuePaused = false;
    processQueue();
};

const handleOverlayDisconnect = (userId) => {
    if (isOverlayBusy && busyForStreamerId === userId) {
        console.log(`[QueueService] Overlay for ${userId} disconnected while busy. Forcing lock release.`);
        isOverlayBusy = false;
        busyForStreamerId = null;
    }
    console.log(`[QueueService] Overlay for ${userId} disconnected. Auto-pausing queue.`);
    pauseQueue();
};

const getStatus = async () => {
    const jobs = await QueuedPack.find()
        .populate('redeemer', 'username')
        .sort({ createdAt: 'asc' });

    return {
        isBusy: isOverlayBusy,
        isPaused: isQueuePaused,
        queue: jobs.map(job => job.redeemer.username),
    };
};

module.exports = {
    initializeQueueService,
    addToQueue,
    markAsReady,
    getStatus,
    processQueue,
    pauseQueue,
    resumeQueue,
    handleOverlayDisconnect,
};
