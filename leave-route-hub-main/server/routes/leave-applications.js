const express = require('express');
const { body, validationResult } = require('express-validator');
const LeaveApplication = require('../models/LeaveApplication');
const AcademicCalendar = require('../models/AcademicCalendar');
const auth = require('../middleware/auth');

const router = express.Router();

// Get leave applications (with filters)
router.get('/', auth, async (req, res) => {
  try {
    const { status, student_id } = req.query;
    const user = req.user;
    
    let filter = {};
    
    // Apply role-based filtering
    if (user.role === 'student') {
      filter.student_id = user._id;
    } else if (user.role === 'advisor') {
      // Advisors see pending and their reviewed applications
      if (status) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = { $in: ['pending_advisor', 'advisor_approved', 'advisor_rejected'] };
      }
    } else if (user.role === 'hod') {
      // HODs see advisor-approved applications and their reviewed ones
      if (status) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = { $in: ['advisor_approved', 'hod_approved', 'hod_rejected'] };
      }
    }
    
    // Apply additional filters
    if (student_id && (user.role === 'advisor' || user.role === 'hod')) {
      filter.student_id = student_id;
    }

    const applications = await LeaveApplication.find(filter)
      .populate('student_id', 'full_name email department')
      .populate('advisor_reviewed_by', 'full_name')
      .populate('hod_reviewed_by', 'full_name')
      .sort({ created_at: -1 });

    res.json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create leave application
router.post('/', [
  auth,
  body('leave_type').isIn(['sick', 'casual', 'emergency', 'other']),
  body('start_date').isISO8601(),
  body('end_date').isISO8601(),
  body('reason').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    // Only students can create applications
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can create leave applications' });
    }

    const { leave_type, start_date, end_date, reason } = req.body;

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    if (startDate >= endDate) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Check for restricted academic events
    const restrictedEventTypes = ['exam', 'expert-session', 'important-event'];
    const restrictedEvents = await AcademicCalendar.find({
      event_type: { $in: restrictedEventTypes },
      $or: [
        // Event starts during leave period
        {
          start_date: { $gte: startDate, $lte: endDate }
        },
        // Event ends during leave period
        {
          end_date: { $gte: startDate, $lte: endDate }
        },
        // Event spans entire leave period
        {
          start_date: { $lte: startDate },
          end_date: { $gte: endDate }
        },
        // Leave spans entire event period
        {
          start_date: { $gte: startDate },
          end_date: { $lte: endDate }
        }
      ]
    });

    // Auto-reject non-medical leaves on restricted dates
    if (restrictedEvents.length > 0 && leave_type !== 'sick') {
      const eventTitles = restrictedEvents.map(event => event.title).join(', ');
      
      const application = new LeaveApplication({
        student_id: req.user._id,
        leave_type,
        start_date: startDate,
        end_date: endDate,
        reason,
        status: 'advisor_rejected',
        advisor_comment: `Auto-rejected: Leave conflicts with important academic events (${eventTitles}). Only medical leaves are considered during these dates.`,
        advisor_reviewed_at: new Date(),
        advisor_reviewed_by: null // System auto-rejection
      });

      await application.save();
      
      const populatedApplication = await LeaveApplication.findById(application._id)
        .populate('student_id', 'full_name email department');

      return res.status(201).json({
        message: 'Leave application auto-rejected due to academic calendar conflicts',
        application: populatedApplication,
        auto_rejected: true,
        conflicting_events: restrictedEvents.map(event => ({
          title: event.title,
          date: event.event_date,
          type: event.event_type
        }))
      });
    }

    // For medical leaves on restricted dates, add a note but allow processing
    let initialStatus = 'pending_advisor';
    let systemNote = '';
    
    if (restrictedEvents.length > 0 && leave_type === 'sick') {
      const eventTitles = restrictedEvents.map(event => event.title).join(', ');
      systemNote = `Note: This medical leave conflicts with important academic events (${eventTitles}). Please review carefully.`;
    }

    const application = new LeaveApplication({
      student_id: req.user._id,
      leave_type,
      start_date: startDate,
      end_date: endDate,
      reason: systemNote ? `${reason}\n\n${systemNote}` : reason,
      status: initialStatus
    });

    await application.save();
    
    const populatedApplication = await LeaveApplication.findById(application._id)
      .populate('student_id', 'full_name email department');

    res.status(201).json({
      message: 'Leave application created successfully',
      application: populatedApplication,
      system_note: systemNote || null,
      conflicting_events: restrictedEvents.length > 0 ? restrictedEvents.map(event => ({
        title: event.title,
        date: event.event_date,
        type: event.event_type
      })) : null
    });
  } catch (error) {
    console.error('Create application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Review leave application
router.post('/:id/review', [
  auth,
  body('approved').isBoolean(),
  body('comment').trim().isLength({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: 'Validation errors', errors: errors.array() });
    }

    const { approved, comment } = req.body;
    const user = req.user;
    const applicationId = req.params.id;

    const application = await LeaveApplication.findById(applicationId);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Check permissions and status
    if (user.role === 'advisor') {
      if (application.status !== 'pending_advisor') {
        return res.status(400).json({ message: 'Application is not pending advisor review' });
      }
      
      application.status = approved ? 'advisor_approved' : 'advisor_rejected';
      application.advisor_comment = comment;
      application.advisor_reviewed_at = new Date();
      application.advisor_reviewed_by = user._id;
    } else if (user.role === 'hod') {
      if (application.status !== 'advisor_approved') {
        return res.status(400).json({ message: 'Application must be advisor-approved first' });
      }
      
      application.status = approved ? 'hod_approved' : 'hod_rejected';
      application.hod_comment = comment;
      application.hod_reviewed_at = new Date();
      application.hod_reviewed_by = user._id;
    } else {
      return res.status(403).json({ message: 'Only advisors and HODs can review applications' });
    }

    await application.save();
    
    const updatedApplication = await LeaveApplication.findById(applicationId)
      .populate('student_id', 'full_name email department')
      .populate('advisor_reviewed_by', 'full_name')
      .populate('hod_reviewed_by', 'full_name');

    res.json({
      message: `Application ${approved ? 'approved' : 'rejected'} successfully`,
      application: updatedApplication
    });
  } catch (error) {
    console.error('Review application error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
