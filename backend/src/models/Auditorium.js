const mongoose = require('mongoose');

const auditoriumSchema = new mongoose.Schema(
  {
    auditoriumName: {
      type: String,
      required: [true, 'Auditorium name is required'],
      trim: true
    },
    auditoriumNumber: {
      type: String,
      required: [true, 'Auditorium number is required'],
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

const Auditorium = mongoose.model('Auditorium', auditoriumSchema, 'auditoriums');

module.exports = Auditorium;
