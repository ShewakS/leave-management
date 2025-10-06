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

    const users = await User.find(filter)
      .select('-password')
      .sort({ full_name: 1 });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
