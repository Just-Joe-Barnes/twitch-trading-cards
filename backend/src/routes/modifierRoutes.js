const express = require('express');
const router = express.Router();
const Modifier = require('../models/modifierModel');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// @desc    Create a modifier
// @route   POST /api/modifiers
// @access  Private/Admin
router.post('/', protect, adminOnly, async (req, res) => {
  const { name, description, css, blendMode, filter, animation, overlayImage, overlayBlendMode } = req.body;

  const modifier = new Modifier({
    name,
    description,
    css,
    blendMode,
    filter,
    animation,
    overlayImage,
    overlayBlendMode,
  });

  try {
    const createdModifier = await modifier.save();
    res.status(201).json(createdModifier);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create modifier' });
  }
});

// @desc    Get all modifiers
// @route   GET /api/modifiers
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const modifiers = await Modifier.find({});
    res.json(modifiers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch modifiers' });
  }
});

// @desc    Get modifier by ID
// @route   GET /api/modifiers/:id
// @access  Private/Admin
// Allow any authenticated user to fetch a modifier
router.get('/:id', protect, async (req, res) => {
  try {
    const modifier = await Modifier.findById(req.params.id);
    if (modifier) {
      res.json(modifier);
    } else {
      res.status(404).json({ message: 'Modifier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch modifier' });
  }
});

// @desc    Update a modifier
// @route   PUT /api/modifiers/:id
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  const { name, description, css, blendMode, filter, animation, overlayImage, overlayBlendMode } = req.body;

  try {
    const modifier = await Modifier.findById(req.params.id);

    if (modifier) {
      modifier.name = name || modifier.name;
      modifier.description = description || modifier.description;
      modifier.css = css || modifier.css;
      modifier.blendMode = blendMode || modifier.blendMode;
      modifier.filter = filter || modifier.filter;
      modifier.animation = animation || modifier.animation;
      modifier.overlayImage = overlayImage || modifier.overlayImage;
      modifier.overlayBlendMode = overlayBlendMode || modifier.overlayBlendMode;

      const updatedModifier = await modifier.save();
      res.json(updatedModifier);
    } else {
      res.status(404).json({ message: 'Modifier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to update modifier' });
  }
});

// @desc    Delete a modifier
// @route   DELETE /api/modifiers/:id
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const modifier = await Modifier.findById(req.params.id);

    if (modifier) {
      await modifier.remove();
      res.json({ message: 'Modifier removed' });
    } else {
      res.status(404).json({ message: 'Modifier not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete modifier' });
  }
});

module.exports = router;
