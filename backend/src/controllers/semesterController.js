const mongoose = require('mongoose');
const Semester = require('../models/Semester');
const Subject = require('../models/Subject');
const ClassSection = require('../models/ClassSection');
const TimetableEntry = require('../models/TimetableEntry');
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
    // Check if any timetable entry references this semester
    const timetableCount = await TimetableEntry.countDocuments({ semester: req.params.id });

    if (subjectCount > 0 || sectionCount > 0 || timetableCount > 0) {
      const reasons = [];
      if (subjectCount > 0) reasons.push(`${subjectCount} subject(s)`);
      if (sectionCount > 0) reasons.push(`${sectionCount} class section(s)`);
      if (timetableCount > 0) reasons.push(`${timetableCount} timetable schedule entry(ies)`);

      return errorResponse(
        res,
        `Cannot delete '${semester.name}'. It is currently referenced by ${reasons.join(' and ')}. Please reassign or delete these dependencies first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { dependencies: reasons },
          recommendation: 'Reassign or delete dependent subjects, sections, or timetable slots before deleting this semester.'
        }
      );
    }

    await semester.deleteOne();
    return successResponse(res, null, 'Semester deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete semesters with referential integrity guard
 * DELETE /api/v1/admin/semesters/bulk
 */
const bulkDeleteSemesters = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of semester IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more semester IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const semesters = await Semester.find({ _id: { $in: uniqueIds } });
    if (semesters.length === 0) {
      return errorResponse(res, 'None of the specified semesters were found.', 404);
    }

    // Check usage in Subject, ClassSection, and TimetableEntry
    const [subRefs, secRefs, ttRefs] = await Promise.all([
      Subject.find({ semester: { $in: uniqueIds } }).distinct('semester'),
      ClassSection.find({ semester: { $in: uniqueIds } }).distinct('semester'),
      TimetableEntry.find({ semester: { $in: uniqueIds } }).distinct('semester')
    ]);

    const referencedSet = new Set([...subRefs, ...secRefs, ...ttRefs].map((id) => id.toString()));

    const blockedItems = semesters.filter((s) => referencedSet.has(s._id.toString()));
    const safeToDelete = semesters.filter((s) => !referencedSet.has(s._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected semester(s). All ${blockedItems.length} selected semester(s) are currently referenced by active subjects, class sections, or timetable schedules.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { blockedSemesters: blockedItems.map((s) => `${s.name} (${s.academicYear})`) },
          recommendation: 'Reassign or remove linked subjects, sections, and timetable sessions before deleting these semesters.'
        }
      );
    }

    const safeIds = safeToDelete.map((s) => s._id);
    const deleteResult = await Semester.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} semester(s) deleted successfully. ${blockedItems.length} semester(s) could not be deleted because they have active dependencies.`
      : `${deleteResult.deletedCount} semester(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((s) => ({ id: s._id, name: s.name, academicYear: s.academicYear })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  bulkDeleteSemesters
};
