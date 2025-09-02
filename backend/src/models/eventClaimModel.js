const mongoose = require('mongoose');

const eventClaimSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
}, {
    timestamps: { createdAt: true, updatedAt: false }, // Only need to know when it was claimed
});

// Compound index to ensure a user can only claim an event once
// and to speed up checks to see if a user has already claimed an event.
eventClaimSchema.index({ eventId: 1, userId: 1 }, { unique: true });

const EventClaim = mongoose.model('EventClaim', eventClaimSchema);

module.exports = EventClaim;
