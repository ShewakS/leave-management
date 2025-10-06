const mongoose = require('mongoose');

const AcademicCalendarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  event_type: {
    type: String,
    required: true,
    trim: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for better query performance
AcademicCalendarSchema.index({ start_date: 1 });
AcademicCalendarSchema.index({ end_date: 1 });
AcademicCalendarSchema.index({ event_type: 1 });

module.exports = mongoose.model('AcademicCalendar', AcademicCalendarSchema);
