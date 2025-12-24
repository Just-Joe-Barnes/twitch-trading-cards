const mongoose = require('mongoose');

const titleSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    color: { type: String, default: '' },
    gradient: { type: String, default: '' },
    isAnimated: { type: Boolean, default: false },
    effect: { type: String, default: '' }
}, { timestamps: true });

titleSchema.index({ slug: 1 }, { unique: true });

const Title = mongoose.model('Title', titleSchema);

module.exports = Title;
