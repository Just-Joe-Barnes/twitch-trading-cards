// src/models/collectionModel.js

const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    cards: [
        {
            name: { type: String, required: true },
            imageUrl: { type: String, required: true },
            flavorText: { type: String },
            rarity: { type: String, required: true },
            mintNumber: { type: Number, required: true },
            totalCopies: { type: Number, required: true },
        },
    ],
});

const Collection = mongoose.model('Collection', collectionSchema);

module.exports = Collection;
