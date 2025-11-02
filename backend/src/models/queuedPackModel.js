const mongoose = require('mongoose');

const queuedPackSchema = new mongoose.Schema({
    streamerDbId: {
        type: String,
        required: true,
    },
    redeemer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Pack',
        default: null,
    },
}, {
    timestamps: true,
});

queuedPackSchema.index({ createdAt: 1 });

module.exports = mongoose.model('QueuedPack', queuedPackSchema);
