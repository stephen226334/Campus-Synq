const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid record ID format')
];

const periodCreateValidator = [
  body('periodNumber')
    .trim()
    .notEmpty()
    .withMessage('Period number/identifier is required (e.g. P1, P2)')
    .toUpperCase(),
  body('startTime')
    .trim()
    .notEmpty()
    .withMessage('Start time is required (e.g. 9:00 AM)'),
  body('endTime')
    .trim()
    .notEmpty()
    .withMessage('End time is required (e.g. 9:50 AM)'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const periodUpdateValidator = [
  body('periodNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Period number cannot be empty')
    .toUpperCase(),
  body('startTime')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Start time cannot be empty'),
  body('endTime')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('End time cannot be empty'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

module.exports = {
  idParamValidator,
  periodCreateValidator,
  periodUpdateValidator
};
