const mongoose = require('mongoose');

const substitutionSchema = new mongoose.Schema(
  {
    timetableEntry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimetableEntry',
      required: [true, 'Timetable entry reference is required']
    },
    day: {
      type: String,
      required: [true, 'Day is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    date: {
      type: String,
      required: [true, 'Date string is required']
    },
    period: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Period',
      required: [true, 'Period is required']
    },
    originalFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Original faculty is required']
    },
    substituteFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Substitute faculty is required']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject is required']
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: [true, 'Section is required']
    },
    roomType: {
      type: String,
      required: true,
      enum: ['Classroom', 'Lab', 'Auditorium']
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    roomDetails: {
      roomNumber: { type: String, required: true },
      name: { type: String },
      capacity: { type: Number }
    },
    reason: {
      type: String,
      trim: true,
      default: 'Faculty class substitution request'
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'PENDING', 'CANCELLED'],
      default: 'CONFIRMED'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: true
    }
  },
  {
    timestamps: true
  }
);

substitutionSchema.index({ day: 1, period: 1, substituteFaculty: 1 });
substitutionSchema.index({ timetableEntry: 1, date: 1 });

const Substitution = mongoose.model('Substitution', substitutionSchema, 'substitutions');

module.exports = Substitution;
