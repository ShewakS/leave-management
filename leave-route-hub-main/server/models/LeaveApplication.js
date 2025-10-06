const mongoose = require('mongoose');

const LeaveApplicationSchema = new mongoose.Schema({
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leave_type: {
    type: String,
    required: true,
    enum: ['sick', 'casual', 'emergency', 'other']
  },
  start_date: {
    type: Date,
    required: true
  },
  end_date: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending_advisor', 'advisor_approved', 'advisor_rejected', 'hod_approved', 'hod_rejected'],
    default: 'pending_advisor'
  },
  advisor_comment: {
    type: String,
    trim: true
  },
  advisor_reviewed_at: {
    type: Date
  },
  advisor_reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  hod_comment: {
    type: String,
    trim: true
  },
  hod_reviewed_at: {
    type: Date
  },
  hod_reviewed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for better query performance
LeaveApplicationSchema.index({ student_id: 1 });
LeaveApplicationSchema.index({ status: 1 });
LeaveApplicationSchema.index({ created_at: -1 });

module.exports = mongoose.model('LeaveApplication', LeaveApplicationSchema);
