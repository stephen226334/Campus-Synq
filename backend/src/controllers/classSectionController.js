const mongoose = require('mongoose');
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

/**
 * Bulk delete class sections with referential integrity guard
 * DELETE /api/v1/admin/class-sections/bulk
 */
const bulkDeleteClassSections = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of class section IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more class section IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const sections = await ClassSection.find({ _id: { $in: uniqueIds } });
    if (sections.length === 0) {
      return errorResponse(res, 'None of the specified class sections were found.', 404);
    }

    // Check usage in TimetableEntry
    const referencedSectionIds = await TimetableEntry.find({ section: { $in: uniqueIds } }).distinct('section');
    const referencedSet = new Set(referencedSectionIds.map((id) => id.toString()));

    const blockedItems = sections.filter((s) => referencedSet.has(s._id.toString()));
    const safeToDelete = sections.filter((s) => !referencedSet.has(s._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected class section(s). All ${blockedItems.length} selected section(s) are currently scheduled in active timetable sessions.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { blockedSections: blockedItems.map((s) => s.name) },
          recommendation: 'Reassign or remove linked timetable sessions before deleting these class sections.'
        }
      );
    }

    const safeIds = safeToDelete.map((s) => s._id);
    const deleteResult = await ClassSection.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} class section(s) deleted successfully. ${blockedItems.length} section(s) could not be deleted because they are assigned to timetable sessions.`
      : `${deleteResult.deletedCount} class section(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((s) => ({ id: s._id, name: s.name })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getClassSections,
  getClassSectionById,
  createClassSection,
  updateClassSection,
  deleteClassSection,
  bulkDeleteClassSections
};
