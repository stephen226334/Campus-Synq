const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const ClassSection = require('../models/ClassSection');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all semesters with search & filtering
 * GET /api/v1/admin/semesters
 */
const getSemesters = async (req, res, next) => {
  try {
    const { search, status, sort = '-createdAt' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { academicYear: { $regex: search, $options: 'i' } }
      ];
    }

    const semesters = await Semester.find(query).sort(sort).lean();
    return successResponse(res, semesters, 'Semesters retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single semester by ID
 * GET /api/v1/admin/semesters/:id
 */
const getSemesterById = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) {
      return errorResponse(res, 'Semester not found', 404);
    }
    return successResponse(res, semester, 'Semester retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new semester
 * POST /api/v1/admin/semesters
 */
const createSemester = async (req, res, next) => {
  try {
    const { name, academicYear, status = 'ACTIVE' } = req.body;

    // Check duplicate
    const existing = await Semester.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
      academicYear: academicYear.trim()
    });

    if (existing) {
      return errorResponse(res, `'${name}' for academic year '${academicYear}' already exists.`, 409);
    }

    const semester = await Semester.create({
      name: name.trim(),
      academicYear: academicYear.trim(),
      status: status.toUpperCase()
    });

    return successResponse(res, semester, 'Semester created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing semester
 * PUT /api/v1/admin/semesters/:id
 */
const updateSemester = async (req, res, next) => {
  try {
    const { name, academicYear, status } = req.body;
    const semester = await Semester.findById(req.params.id);

    if (!semester) {
      return errorResponse(res, 'Semester not found', 404);
    }

    // Check duplicate conflict with other records
    if (name || academicYear) {
      const targetName = name ? name.trim() : semester.name;
      const targetYear = academicYear ? academicYear.trim() : semester.academicYear;

      const duplicate = await Semester.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${targetName}$`, 'i') },
        academicYear: targetYear
      });

      if (duplicate) {
        return errorResponse(res, `'${targetName}' for academic year '${targetYear}' already exists.`, 409);
      }
    }

    if (name) semester.name = name.trim();
    if (academicYear) semester.academicYear = academicYear.trim();
    if (status) semester.status = status.toUpperCase();

    await semester.save();

    return successResponse(res, semester, 'Semester updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a semester (with referential integrity checks)
 * DELETE /api/v1/admin/semesters/:id
 */
const deleteSemester = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id);
    if (!semester) {
      return errorResponse(res, 'Semester not found', 404);
    }

    // Check if any subject references this semester
    const subjectCount = await Subject.countDocuments({ semester: req.params.id });
    // Check if any class section references this semester
    const sectionCount = await ClassSection.countDocuments({ semester: req.params.id });

    if (subjectCount > 0 || sectionCount > 0) {
      const reasons = [];
      if (subjectCount > 0) reasons.push(`${subjectCount} subject(s)`);
      if (sectionCount > 0) reasons.push(`${sectionCount} class section(s)`);

      return errorResponse(
        res,
        `Cannot delete '${semester.name}'. It is currently referenced by ${reasons.join(' and ')}. Please reassign or delete these dependencies first.`,
        400
      );
    }

    await semester.deleteOne();
    return successResponse(res, null, 'Semester deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester
};
