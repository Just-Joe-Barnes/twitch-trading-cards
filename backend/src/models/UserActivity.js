// models/UserActivity.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userActivitySchema = new Schema({
    // This creates a reference to the User's _id.
    // It should be unique to enforce a one-to-one relationship.
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
        index: true // Indexing is crucial for fast lookups!
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, { timestamps: false }); // We don't need createdAt/updatedAt here.

module.exports = mongoose.model('UserActivity', userActivitySchema);
