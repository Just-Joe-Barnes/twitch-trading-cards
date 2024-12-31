// File: backend/src/models/mintingLogModel.js

const mongoose = require('mongoose');

const mintingLogSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    cards: [
        {
            name: String,
            rarity: String,
            mintNumber: Number,
            totalCopies: Number,
            flavorText: String,
            imageUrl: String,
        },
    ],
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('MintingLog', mintingLogSchema);
