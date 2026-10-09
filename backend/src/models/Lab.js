const mongoose = require('mongoose');

const labSchema = new mongoose.Schema(
  {
    labName: {
      type: String,
      required: [true, 'Lab name is required'],
      trim: true
    },
    labNumber: {
      type: String,
      required: [true, 'Lab number is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [1, 'Capacity must be at least 1']
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

const Lab = mongoose.model('Lab', labSchema, 'labs');

module.exports = Lab;
