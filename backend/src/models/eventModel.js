const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Event name is required.'],
        trim: true,
    },
    description: {
        type: String,
        required: [true, 'Event description is required.'],
    },
    startTime: {
        type: Date,
        required: [true, 'Start time is required.'],
    },
    endTime: {
        type: Date,
        required: [true, 'End time is required.'],
    },
    triggerType: {
        type: String,
        required: true,
        enum: ['LOGIN', 'TRADE', 'PACK_OPEN'],
        default: 'LOGIN',
    },
    rewardType: {
        type: String,
        required: true,
        enum: ['CARD', 'PACK', 'XP', 'RANDOM_CARD'],
    },
    rewardDetails: {
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    message: {
        type: String,
        required: false,
        default: null,
    },
}, {
    timestamps: true,
});

// Index to help quickly find active events
eventSchema.index({ isActive: 1, triggerType: 1, startTime: 1, endTime: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
