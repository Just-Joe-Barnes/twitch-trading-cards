const mongoose = require('mongoose');

const modifierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  css: {
    type: String,
    required: true,
  },
  blendMode: {
    type: String,
  },
  filter: {
    type: String,
  },
  animation: {
    type: String,
  },
  overlayImage: {
    type: String,
  },
  overlayBlendMode: {
    type: String,
  },
});

const Modifier = mongoose.model('Modifier', modifierSchema);

module.exports = Modifier;
