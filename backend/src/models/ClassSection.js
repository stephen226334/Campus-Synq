const mongoose = require('mongoose');

const classSectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Section name is required'],
      trim: true
    },
    semester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Semester',
      required: [true, 'Semester reference is required']
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

classSectionSchema.index({ name: 1, semester: 1 }, { unique: true });

const ClassSection = mongoose.model('ClassSection', classSectionSchema, 'classSections');

module.exports = ClassSection;
