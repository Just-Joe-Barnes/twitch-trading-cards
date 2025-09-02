const express = require('express');
const router = express.Router();
const Event = require('../models/eventModel');
const { protect } = require('../middleware/authMiddleware');

const adminOnly = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ message: 'Admin access required.' });
    }
    next();
};

router.get('/', protect, adminOnly, async (req, res) => {
    try {
        const events = await Event.find({}).sort({ createdAt: -1 });
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch events', error: error.message });
    }
});

router.post('/', protect, adminOnly, async (req, res) => {
    try {
        const newEvent = new Event(req.body);
        await newEvent.save();
        res.status(201).json(newEvent);
    } catch (error) {
        res.status(400).json({ message: 'Failed to create event', error: error.message });
    }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
    try {
        const updatedEvent = await Event.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true,
        });
        if (!updatedEvent) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json(updatedEvent);
    } catch (error) {
        res.status(400).json({ message: 'Failed to update event', error: error.message });
    }
});

router.put('/:id/toggle', protect, adminOnly, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        event.isActive = !event.isActive;
        await event.save();
        res.status(200).json(event);
    } catch (error) {
        res.status(500).json({ message: 'Failed to toggle event status', error: error.message });
    }
});


module.exports = router;
