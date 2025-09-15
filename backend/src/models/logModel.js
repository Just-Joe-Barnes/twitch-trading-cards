const mongoose = require('mongoose');

const logSchema = mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User', // Assuming your user model is named 'User'
        },
        event: {
            type: String,
            required: true,
            trim: true,
        },
        message: {
            type: String,
            required: false, // Make this optional
            trim: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            required: false,
        },
    },
    {
        timestamps: true, // This will automatically add `createdAt` and `updatedAt` fields
    }
);

const Log = mongoose.model('Log', logSchema);

module.exports = Log;
