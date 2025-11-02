const mongoose = require('mongoose');

const packSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    isOpened: { type: Boolean, default: false },
    openedAt: { type: Date },
    cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],

    name: { type: String, required: true },
    cardPool: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
    animationUrl: { type: String, default: '/animations/packopening.mp4' }
}, { timestamps: true });

module.exports = mongoose.model('Pack', packSchema);
