const mongoose = require('mongoose');

const periodCounterSchema = new mongoose.Schema({
    scope: {
        type: String,
        enum: ['weekly', 'monthly'],
        required: true,
    },
    periodKey: {
        type: String,
        required: true,
    },
    year: {
        type: Number,
        required: true,
    },
    week: {
        type: Number,
    },
    month: {
        type: Number,
    },
    count: {
        type: Number,
        default: 0,
    },
    activeUserIds: {
        type: [String],
    }
}, {
    timestamps: true,
    indexes: [
        { fields: { scope: 1, periodKey: 1 }, unique: true }
    ]
});

module.exports = mongoose.model('PeriodCounter', periodCounterSchema);

