const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema(
  {
    periodNumber: {
      type: String,
      required: [true, 'Period identifier/number is required (e.g. P1, P2)'],
      unique: true,
      uppercase: true,
      trim: true
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required (e.g. 9:00 AM)'],
      trim: true
    },
    endTime: {
      type: String,
      required: [true, 'End time is required (e.g. 9:50 AM)'],
      trim: true
    },
    order: {
      type: Number,
      default: 1
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

// Virtual for formatted slot e.g. "P1 (9:00 AM - 9:50 AM)"
periodSchema.virtual('label').get(function () {
  return `${this.periodNumber} (${this.startTime} - ${this.endTime})`;
});

periodSchema.set('toJSON', { virtuals: true });
periodSchema.set('toObject', { virtuals: true });

const Period = mongoose.model('Period', periodSchema, 'periods');

module.exports = Period;
