const Log = require('../models/logModel');

/**
 * Creates a new log entry.
 * @param {object} user - The user document.
 * @param {string} event - A short identifier for the event (e.g., 'LOGIN', 'REWARD_GRANTED').
 * @param {string} [message] - An optional, human-readable message.
 * @param {object} [data] - Optional structured data related to the event.
 */
const createLogEntry = async (user, event, message = null, data = null) => {
    try {
        const newLog = new Log({
            user: user._id,
            event: event,
            message: typeof message === 'string' ? message : JSON.stringify(message, null, 2),
            data: data,
        });
        await newLog.save();
        console.log(`[LOG] Event logged for user ${user._id}: ${event} - ${message}`);
    } catch (logErr) {
        // Log the error but do not throw, so the main application flow is not interrupted.
        console.error("Failed to save log entry:", logErr);
    }
};

module.exports = { createLogEntry };
