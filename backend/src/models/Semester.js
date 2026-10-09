const mongoose = require('mongoose');

const semesterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Semester name/number is required'],
      trim: true
    },
    academicYear: {
      type: String,
      required: [true, 'Academic year is required'],
      trim: true,
      match: [/^\d{4}-\d{4}$/, 'Academic year must follow YYYY-YYYY format (e.g. 2026-2027)']
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    }
  },
  {
    timestamps: true
  }
);

// Compound index to prevent duplicate semester within the same academic year
semesterSchema.index({ name: 1, academicYear: 1 }, { unique: true });

const Semester = mongoose.model('Semester', semesterSchema, 'semesters');

module.exports = Semester;
