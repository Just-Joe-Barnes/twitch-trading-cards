const mongoose = require('mongoose');

const binderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true,
    },
    pages: {
        type: Array,
        default: [],
    },
    cover: {
        type: Object,
        default: {},
    },
}, {
    timestamps: true,
});

const Binder = mongoose.model('Binder', binderSchema);

module.exports = Binder;
