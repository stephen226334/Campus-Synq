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

module.exports = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject
};
