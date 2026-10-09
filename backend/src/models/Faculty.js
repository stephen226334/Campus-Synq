const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const facultySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters long'],
      maxlength: [100, 'Full name cannot exceed 100 characters']
    },
    facultyId: {
      type: String,
      required: [true, 'Faculty ID is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    personalEmail: {
      type: String,
      required: [true, 'Personal email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid personal email address']
    },
    officialEmail: {
      type: String,
      required: [true, 'Official Campus Synq email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@campussynq\.com$/, 'Official email must end with @campussynq.com']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    department: {
      type: String,
      default: 'Computer Science',
      trim: true
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false
    },
    role: {
      type: String,
      enum: ['ADMIN', 'FACULTY', 'HOD_FACULTY', 'STUDENT'],
      default: 'FACULTY'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'INACTIVE'],
      default: 'ACTIVE'
    },
    assignedSubjects: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject'
      }
    ],
    assignedSections: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClassSection'
      }
    ],
    emailDeliveryStatus: {
      type: String,
      enum: ['SENT', 'FAILED', 'PENDING'],
      default: 'PENDING'
    },
    lastEmailSentAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// Hash password before saving if modified
facultySchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
facultySchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Remove password from returned object
facultySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const Faculty = mongoose.model('Faculty', facultySchema, 'faculties');

module.exports = Faculty;
