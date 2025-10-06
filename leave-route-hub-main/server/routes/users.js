const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get users (for advisors/HODs to view profiles)
router.get('/', auth, async (req, res) => {
  try {
    // Only advisors and HODs can view user lists
    if (req.user.role === 'student') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { role } = req.query;
    let filter = {};

    if (role) {
      filter.role = role;
    }

    // Visibility rules
    if (req.user.role === 'advisor') {
      // Advisors can only see students in their department AND section
      filter.department = req.user.department;
      filter.section = req.user.section;
      if (!filter.role) filter.role = 'student';
    } else if (req.user.role === 'hod') {
      // HOD can see all users in their department
      filter.department = req.user.department;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ full_name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Advisors can update their own section
router.patch('/me/section', auth, async (req, res) => {
  try {
    if (req.user.role !== 'advisor') {
      return res.status(403).json({ message: 'Only advisors can update section' });
    }

    const { section } = req.body;
    if (!section || typeof section !== 'string' || section.trim().length === 0) {
      return res.status(400).json({ message: 'Section is required' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { section: section.trim() },
      { new: true }
    ).select('-password');

    res.json({ message: 'Section updated', user: updated });
  } catch (error) {
    console.error('Update section error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
