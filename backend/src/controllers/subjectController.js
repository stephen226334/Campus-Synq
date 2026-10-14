const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Get all subjects with search & filter
 * GET /api/v1/admin/subjects
 */
const getSubjects = async (req, res, next) => {
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
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const subjects = await Subject.find(query)
      .populate('semester', 'name academicYear status')
      .sort(sort)
      .lean();

    return successResponse(res, subjects, 'Subjects retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single subject by ID
 * GET /api/v1/admin/subjects/:id
 */
const getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id).populate('semester', 'name academicYear status');
    if (!subject) {
      return errorResponse(res, 'Subject not found', 404);
    }
    return successResponse(res, subject, 'Subject retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new subject
 * POST /api/v1/admin/subjects
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, semester, status = 'ACTIVE' } = req.body;

    // Check if semester exists
    const semesterDoc = await Semester.findById(semester);
    if (!semesterDoc) {
      return errorResponse(res, 'Selected semester does not exist.', 400);
    }

    // Check duplicate code
    const existingCode = await Subject.findOne({ code: code.trim().toUpperCase() });
    if (existingCode) {
      return errorResponse(res, `Subject code '${code.trim().toUpperCase()}' already exists.`, 409);
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      semester,
      status: status.toUpperCase()
    });

    const populated = await Subject.findById(subject._id).populate('semester', 'name academicYear status');

    return successResponse(res, populated, 'Subject created successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update a subject
 * PUT /api/v1/admin/subjects/:id
 */
const updateSubject = async (req, res, next) => {
  try {
    const { name, code, semester, status } = req.body;
    const subject = await Subject.findById(req.params.id);

    if (!subject) {
      return errorResponse(res, 'Subject not found', 404);
    }

    if (semester) {
      const semesterDoc = await Semester.findById(semester);
      if (!semesterDoc) {
        return errorResponse(res, 'Selected semester does not exist.', 400);
      }
      subject.semester = semester;
    }

    if (code) {
      const formattedCode = code.trim().toUpperCase();
      const duplicate = await Subject.findOne({
        _id: { $ne: req.params.id },
        code: formattedCode
      });
      if (duplicate) {
        return errorResponse(res, `Subject code '${formattedCode}' already exists.`, 409);
      }
      subject.code = formattedCode;
    }

    if (name) subject.name = name.trim();
    if (status) subject.status = status.toUpperCase();

    await subject.save();

    const populated = await Subject.findById(subject._id).populate('semester', 'name academicYear status');

    return successResponse(res, populated, 'Subject updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a subject
 * DELETE /api/v1/admin/subjects/:id
 */
const deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return errorResponse(res, 'Subject not found', 404);
    }

    const timetableCount = await TimetableEntry.countDocuments({ subject: req.params.id });
    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete subject '${subject.name}' (${subject.code}). It is currently scheduled in ${timetableCount} timetable session(s). Please reassign or delete these sessions first.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { timetableUsageCount: timetableCount },
          recommendation: 'Reassign or remove linked timetable sessions before deleting this subject.'
        }
      );
    }

    await subject.deleteOne();
    return successResponse(res, null, 'Subject deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete subjects with referential integrity guard
 * DELETE /api/v1/admin/subjects/bulk
 */
const bulkDeleteSubjects = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return errorResponse(res, 'Please provide an array of subject IDs to delete.', 400);
    }

    const invalidIds = ids.filter((id) => !id || !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return errorResponse(res, 'One or more subject IDs are invalid.', 400);
    }

    const uniqueIds = Array.from(new Set(ids.map((id) => id.toString())));
    const subjects = await Subject.find({ _id: { $in: uniqueIds } });
    if (subjects.length === 0) {
      return errorResponse(res, 'None of the specified subjects were found.', 404);
    }

    // Check usage in TimetableEntry
    const referencedSubjectIds = await TimetableEntry.find({ subject: { $in: uniqueIds } }).distinct('subject');
    const referencedSet = new Set(referencedSubjectIds.map((id) => id.toString()));

    const blockedItems = subjects.filter((s) => referencedSet.has(s._id.toString()));
    const safeToDelete = subjects.filter((s) => !referencedSet.has(s._id.toString()));

    if (safeToDelete.length === 0) {
      return errorResponse(
        res,
        `Cannot delete any of the selected subject(s). All ${blockedItems.length} selected subject(s) are currently scheduled in active timetable sessions.`,
        400,
        null,
        {
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          details: { blockedSubjects: blockedItems.map((s) => `${s.name} (${s.code})`) },
          recommendation: 'Reassign or remove linked timetable sessions before deleting these subjects.'
        }
      );
    }

    const safeIds = safeToDelete.map((s) => s._id);
    const deleteResult = await Subject.deleteMany({ _id: { $in: safeIds } });

    const isPartial = blockedItems.length > 0;
    const message = isPartial
      ? `${deleteResult.deletedCount} subject(s) deleted successfully. ${blockedItems.length} subject(s) could not be deleted because they are assigned to timetable sessions.`
      : `${deleteResult.deletedCount} subject(s) deleted successfully.`;

    return successResponse(
      res,
      {
        deletedCount: deleteResult.deletedCount,
        deletedIds: safeIds.map((id) => id.toString()),
        blockedCount: blockedItems.length,
        blockedItems: blockedItems.map((s) => ({ id: s._id, name: s.name, code: s.code })),
        isPartial
      },
      message
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  bulkDeleteSubjects
};
