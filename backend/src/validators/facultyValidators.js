const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid record ID format')
];

const facultyCreateValidator = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),
  body('personalEmail')
    .trim()
    .notEmpty()
    .withMessage('Personal email is required for credential delivery')
    .isEmail()
    .withMessage('Please provide a valid personal email address')
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),
  body('facultyId')
    .trim()
    .notEmpty()
    .withMessage('Faculty ID is required')
    .toUpperCase(),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required'),
  body('designation')
    .trim()
    .notEmpty()
    .withMessage('Designation is required (e.g. Assistant Professor, Professor, HOD)'),
  body('department')
    .optional()
    .trim(),
  body('assignedSubjects')
    .optional()
    .isArray()
    .withMessage('Assigned subjects must be an array of IDs'),
  body('assignedSections')
    .optional()
    .isArray()
    .withMessage('Assigned sections must be an array of IDs'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const facultyUpdateValidator = [
  body('fullName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty'),
  body('personalEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid personal email address')
    .normalizeEmail({ gmail_remove_dots: false, all_lowercase: true }),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty'),
  body('designation')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Designation cannot be empty'),
  body('assignedSubjects')
    .optional()
    .isArray()
    .withMessage('Assigned subjects must be an array of IDs'),
  body('assignedSections')
    .optional()
    .isArray()
    .withMessage('Assigned sections must be an array of IDs'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

module.exports = {
  idParamValidator,
  facultyCreateValidator,
  facultyUpdateValidator
};
