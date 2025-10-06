const express = require('express');
const { body, validationResult } = require('express-validator');
const AcademicCalendar = require('../models/AcademicCalendar');
const auth = require('../middleware/auth');

const router = express.Router();

// Get academic events
router.get('/', auth, async (req, res) => {
  try {
    const events = await AcademicCalendar.find()
      .populate('created_by', 'full_name')
      .sort({ start_date: 1 });

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create academic event
router.post('/', [
  auth,
  body('title').trim().isLength({ min: 1 }),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('event_type').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    // Only advisors and HODs can create events
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Only advisors and HODs can create calendar events' });
    }

    const { title, description, start_date, end_date, event_type } = req.body;

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate > endDate) {
      return res.status(400).json({ message: 'End date must be after or equal to start date' });
    }

    const event = new AcademicCalendar({
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      event_type,
      created_by: req.user._id
    });

    await event.save();
    
    const populatedEvent = await AcademicCalendar.findById(event._id)
      .populate('created_by', 'full_name');

    res.status(201).json({
      message: 'Event created successfully',
      event: populatedEvent
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
