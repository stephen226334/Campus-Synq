const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid record ID format')
];

const timetableCreateValidator = [
  body('day')
    .notEmpty()
    .withMessage('Day of week is required')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day must be one of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'),
  body('period')
    .notEmpty()
    .withMessage('Period is required')
    .isMongoId()
    .withMessage('Valid period reference is required'),
  body('semester')
    .notEmpty()
    .withMessage('Semester is required')
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('section')
    .notEmpty()
    .withMessage('Class section is required')
    .isMongoId()
    .withMessage('Valid class section reference is required'),
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isMongoId()
    .withMessage('Valid subject reference is required'),
  body('faculty')
    .notEmpty()
    .withMessage('Faculty is required')
    .isMongoId()
    .withMessage('Valid faculty reference is required'),
  body('roomType')
    .notEmpty()
    .withMessage('Room type is required')
    .isIn(['Classroom', 'Lab', 'Auditorium'])
    .withMessage('Room type must be Classroom, Lab, or Auditorium'),
  body('roomId')
    .notEmpty()
    .withMessage('Room ID is required')
    .isMongoId()
    .withMessage('Valid room reference ID is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'CANCELLED', 'RESCHEDULED'])
    .withMessage('Status must be ACTIVE, CANCELLED, or RESCHEDULED')
];

const timetableUpdateValidator = [
  body('day')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day must be one of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'),
  body('period')
    .optional()
    .isMongoId()
    .withMessage('Valid period reference is required'),
  body('semester')
    .optional()
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('section')
    .optional()
    .isMongoId()
    .withMessage('Valid class section reference is required'),
  body('subject')
    .optional()
    .isMongoId()
    .withMessage('Valid subject reference is required'),
  body('faculty')
    .optional()
    .isMongoId()
    .withMessage('Valid faculty reference is required'),
  body('roomType')
    .optional()
    .isIn(['Classroom', 'Lab', 'Auditorium'])
    .withMessage('Room type must be Classroom, Lab, or Auditorium'),
  body('roomId')
    .optional()
    .isMongoId()
    .withMessage('Valid room reference ID is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'CANCELLED', 'RESCHEDULED'])
    .withMessage('Status must be ACTIVE, CANCELLED, or RESCHEDULED')
];

module.exports = {
  idParamValidator,
  timetableCreateValidator,
  timetableUpdateValidator
};
