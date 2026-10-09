const { body, param } = require('express-validator');

const idParamValidator = [
  param('id')
    .isMongoId()
    .withMessage('Invalid record ID format')
];

// --- Semester Validators ---
const semesterCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Semester name/number is required'),
  body('academicYear')
    .trim()
    .notEmpty()
    .withMessage('Academic year is required')
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be formatted as YYYY-YYYY (e.g., 2026-2027)'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const semesterUpdateValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Semester name cannot be empty'),
  body('academicYear')
    .optional()
    .trim()
    .matches(/^\d{4}-\d{4}$/)
    .withMessage('Academic year must be formatted as YYYY-YYYY (e.g., 2026-2027)'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

// --- Subject Validators ---
const subjectCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required')
    .toUpperCase(),
  body('semester')
    .notEmpty()
    .withMessage('Semester is required')
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const subjectUpdateValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject name cannot be empty'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject code cannot be empty')
    .toUpperCase(),
  body('semester')
    .optional()
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

// --- Class Section Validators ---
const classSectionCreateValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Section name is required'),
  body('semester')
    .notEmpty()
    .withMessage('Semester is required')
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const classSectionUpdateValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Section name cannot be empty'),
  body('semester')
    .optional()
    .isMongoId()
    .withMessage('Valid semester reference is required'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

// --- Classroom Validators ---
const classroomCreateValidator = [
  body('roomNumber')
    .trim()
    .notEmpty()
    .withMessage('Room number is required')
    .toUpperCase(),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const classroomUpdateValidator = [
  body('roomNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Room number cannot be empty')
    .toUpperCase(),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

// --- Lab Validators ---
const labCreateValidator = [
  body('labName')
    .trim()
    .notEmpty()
    .withMessage('Lab name is required'),
  body('labNumber')
    .trim()
    .notEmpty()
    .withMessage('Lab number is required')
    .toUpperCase(),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const labUpdateValidator = [
  body('labName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Lab name cannot be empty'),
  body('labNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Lab number cannot be empty')
    .toUpperCase(),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

// --- Auditorium Validators ---
const auditoriumCreateValidator = [
  body('auditoriumName')
    .trim()
    .notEmpty()
    .withMessage('Auditorium name is required'),
  body('auditoriumNumber')
    .trim()
    .notEmpty()
    .withMessage('Auditorium number is required')
    .toUpperCase(),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

const auditoriumUpdateValidator = [
  body('auditoriumName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Auditorium name cannot be empty'),
  body('auditoriumNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Auditorium number cannot be empty')
    .toUpperCase(),
  body('capacity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Capacity must be a positive integer of at least 1'),
  body('status')
    .optional()
    .isIn(['ACTIVE', 'INACTIVE'])
    .withMessage('Status must be ACTIVE or INACTIVE')
];

module.exports = {
  idParamValidator,
  semesterCreateValidator,
  semesterUpdateValidator,
  subjectCreateValidator,
  subjectUpdateValidator,
  classSectionCreateValidator,
  classSectionUpdateValidator,
  classroomCreateValidator,
  classroomUpdateValidator,
  labCreateValidator,
  labUpdateValidator,
  auditoriumCreateValidator,
  auditoriumUpdateValidator
};
