const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  threshold: { type: Number, default: 0 },
  packRewards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack' }],
  cardRewards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }]
}, { timestamps: true });

module.exports = mongoose.model('Achievement', achievementSchema);
