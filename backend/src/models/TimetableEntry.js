const mongoose = require('mongoose');

const timetableEntrySchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: [true, 'Day of week is required'],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    period: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Period',
      required: [true, 'Period reference is required']
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required']
    },
    section: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClassSection',
      required: [true, 'Class section reference is required']
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required']
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Faculty reference is required']
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required (Classroom, Lab, Auditorium)'],
      enum: ['Classroom', 'Lab', 'Auditorium']
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Room reference ID is required']
    },
    roomDetails: {
      roomNumber: { type: String, required: true },
      name: { type: String },
      capacity: { type: Number }
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'CANCELLED', 'RESCHEDULED'],
      default: 'ACTIVE'
    },
    isCombinedClass: {
      type: Boolean,
      default: false
    },
    isSubstituted: {
      type: Boolean,
      default: false
    },
    originalFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    substituteFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty'
    },
    substitutionDate: {
      type: String
    },
    substitutionReason: {
      type: String,
      trim: true
    },
    substitutionStatus: {
      type: String,
      enum: ['NONE', 'SUBSTITUTED', 'CANCELLED'],
      default: 'NONE'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high performance conflict checking
timetableEntrySchema.index({ day: 1, period: 1, faculty: 1 });
timetableEntrySchema.index({ day: 1, period: 1, substituteFaculty: 1 });
timetableEntrySchema.index({ day: 1, period: 1, roomId: 1 });
timetableEntrySchema.index({ day: 1, period: 1, section: 1 });

const TimetableEntry = mongoose.model('TimetableEntry', timetableEntrySchema, 'timetableEntries');

module.exports = TimetableEntry;
