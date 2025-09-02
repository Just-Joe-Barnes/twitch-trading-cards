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
        enum: ['LOGIN', 'TRADE', 'PACK_OPEN'], // Future-proofed with enums
        default: 'LOGIN',
    },
    rewardType: {
        type: String,
        required: true,
        enum: ['CARD', 'PACK', 'XP'],
    },
    rewardDetails: {
        // Using Mixed type for flexibility to store different reward structures
        type: mongoose.Schema.Types.Mixed,
        required: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
}, {
    timestamps: true, // Adds createdAt and updatedAt timestamps
});

// Index to help quickly find active events
eventSchema.index({ isActive: 1, triggerType: 1, startTime: 1, endTime: 1 });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
