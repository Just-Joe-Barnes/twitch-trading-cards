const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  threshold: { type: Number, default: 0 },
  packs: { type: Number, default: 0 },
  card: { type: mongoose.Schema.Types.ObjectId, ref: 'Card', default: null }
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);
