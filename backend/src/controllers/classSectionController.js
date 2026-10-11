const ClassSection = require('../models/ClassSection');
const Semester = require('../models/Semester');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all class sections with search & filter
 * GET /api/v1/admin/class-sections
 */
const getClassSections = async (req, res, next) => {
  try {
    const { search, semester, status, sort = '-createdAt' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (semester) {
      query.semester = semester;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const sections = await ClassSection.find(query)
      .populate('semester', 'name academicYear status')
      .sort(sort)
      .lean();

    return successResponse(res, sections, 'Class sections retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single class section by ID
 * GET /api/v1/admin/class-sections/:id
 */
const getClassSectionById = async (req, res, next) => {
  try {
    const section = await ClassSection.findById(req.params.id).populate('semester', 'name academicYear status');
    if (!section) {
      return errorResponse(res, 'Class section not found', 404);
    }
    return successResponse(res, section, 'Class section retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new class section
 * POST /api/v1/admin/class-sections
 */
const createClassSection = async (req, res, next) => {
  try {
    const { name, semester, status = 'ACTIVE' } = req.body;

    // Check if semester exists
    const semesterDoc = await Semester.findById(semester);
    if (!semesterDoc) {
      return errorResponse(res, 'Selected semester does not exist.', 400);
    }

    // Check duplicate section within same semester
    const existingSection = await ClassSection.findOne({
      semester,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingSection) {
      return errorResponse(res, `Class section '${name.trim()}' already exists in this semester.`, 409);
    }

    const section = await ClassSection.create({
      name: name.trim(),
      semester,
      status: status.toUpperCase()
    });

    const populated = await ClassSection.findById(section._id).populate('semester', 'name academicYear status');

    return successResponse(res, populated, 'Class section created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update class section
 * PUT /api/v1/admin/class-sections/:id
 */
const updateClassSection = async (req, res, next) => {
  try {
    const { name, semester, status } = req.body;
    const section = await ClassSection.findById(req.params.id);

    if (!section) {
      return errorResponse(res, 'Class section not found', 404);
    }

    const targetSemester = semester || section.semester;
    const targetName = name ? name.trim() : section.name;

    if (semester) {
      const semesterDoc = await Semester.findById(semester);
      if (!semesterDoc) {
        return errorResponse(res, 'Selected semester does not exist.', 400);
      }
      section.semester = semester;
    }

    if (name || semester) {
      const duplicate = await ClassSection.findOne({
        _id: { $ne: req.params.id },
        semester: targetSemester,
        name: { $regex: new RegExp(`^${targetName}$`, 'i') }
      });

      if (duplicate) {
        return errorResponse(res, `Class section '${targetName}' already exists in this semester.`, 409);
      }
      section.name = targetName;
    }

    if (status) section.status = status.toUpperCase();

    await section.save();

    const populated = await ClassSection.findById(section._id).populate('semester', 'name academicYear status');

    return successResponse(res, populated, 'Class section updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete class section
 * DELETE /api/v1/admin/class-sections/:id
 */
const deleteClassSection = async (req, res, next) => {
  try {
    const section = await ClassSection.findById(req.params.id);
    if (!section) {
      return errorResponse(res, 'Class section not found', 404);
    }

    const timetableCount = await TimetableEntry.countDocuments({ section: req.params.id });
    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete class section '${section.name}'. It is currently scheduled in ${timetableCount} timetable session(s). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: timetableCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this class section.'
        }
      );
    }

    await section.deleteOne();
    return successResponse(res, null, 'Class section deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClassSections,
  getClassSectionById,
  createClassSection,
  updateClassSection,
  deleteClassSection
};
