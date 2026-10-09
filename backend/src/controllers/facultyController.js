const Faculty = require('../models/Faculty');
const TimetableEntry = require('../models/TimetableEntry');
const { generateOfficialEmail, DEFAULT_PASSWORD } = require('../services/facultyCredentialService');
const { sendFacultyCredentialsEmail } = require('../services/emailService');
const { successResponse, errorResponse } = require('../utils/response');
const { academicEvents, ACADEMIC_EVENTS } = require('../utils/eventEmitter');

/**
 * Get all faculty members with search and filter
 * GET /api/v1/admin/faculty
 */
const getFacultyList = async (req, res, next) => {
  try {
    const { search, status, sort = 'fullName' } = req.query;
    const query = {};

    if (status && ['ACTIVE', 'INACTIVE'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { facultyId: { $regex: search, $options: 'i' } },
        { officialEmail: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const faculty = await Faculty.find(query)
      .populate('assignedSubjects', 'name code')
      .populate('assignedSections', 'name')
      .sort(sort)
      .lean();

    return successResponse(res, faculty, 'Faculty list retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single faculty by ID with detailed academic assignments and schedule
 * GET /api/v1/admin/faculty/:id
 */
const getFacultyById = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate('assignedSubjects', 'name code status')
      .populate('assignedSections', 'name status');

    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    // Also fetch faculty's weekly timetable entries
    const timetable = await TimetableEntry.find({
      faculty: req.params.id,
      status: 'ACTIVE'
    })
      .populate('period', 'periodNumber startTime endTime order label')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .populate('semester', 'name academicYear')
      .sort({ day: 1, 'period.order': 1 })
      .lean();

    const facultyData = faculty.toJSON();
    facultyData.timetable = timetable;

    return successResponse(res, facultyData, 'Faculty details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create new Faculty account + credentials + delivery
 * POST /api/v1/admin/faculty
 */
const createFaculty = async (req, res, next) => {
  try {
    const {
      fullName,
      personalEmail,
      facultyId,
      phone,
      designation,
      department = 'Computer Science',
      assignedSubjects = [],
      assignedSections = [],
      status = 'ACTIVE'
    } = req.body;

    const formattedFacultyId = facultyId.trim().toUpperCase();
    const formattedPersonalEmail = personalEmail.trim().toLowerCase();

    // Check duplicate facultyId
    const existingId = await Faculty.findOne({ facultyId: formattedFacultyId });
    if (existingId) {
      return errorResponse(res, `Faculty ID '${formattedFacultyId}' is already registered.`, 409);
    }

    // Check duplicate personalEmail
    const existingPersonalEmail = await Faculty.findOne({ personalEmail: formattedPersonalEmail });
    if (existingPersonalEmail) {
      return errorResponse(res, `Personal email '${formattedPersonalEmail}' is already associated with another faculty member.`, 409);
    }

    // Generate unique official Campus Synq email
    const officialEmail = await generateOfficialEmail(fullName.trim());

    // Create faculty record (password is automatically hashed via pre-save hook)
    const faculty = new Faculty({
      fullName: fullName.trim(),
      facultyId: formattedFacultyId,
      personalEmail: formattedPersonalEmail,
      officialEmail,
      phone: phone.trim(),
      department: department.trim() || 'Computer Science',
      designation: designation.trim(),
      password: DEFAULT_PASSWORD,
      role: 'HOD_FACULTY',
      status: status.toUpperCase(),
      assignedSubjects,
      assignedSections,
      emailDeliveryStatus: 'PENDING'
    });

    await faculty.save();

    // Send credentials to personal email
    const mailResult = await sendFacultyCredentialsEmail({
      fullName: faculty.fullName,
      personalEmail: faculty.personalEmail,
      officialEmail: faculty.officialEmail,
      temporaryPassword: DEFAULT_PASSWORD
    });

    if (mailResult.success) {
      faculty.emailDeliveryStatus = 'SENT';
      faculty.lastEmailSentAt = new Date();
    } else {
      faculty.emailDeliveryStatus = 'FAILED';
    }
    await faculty.save();

    const populated = await Faculty.findById(faculty._id)
      .populate('assignedSubjects', 'name code')
      .populate('assignedSections', 'name');

    academicEvents.emit(ACADEMIC_EVENTS.FACULTY_UPDATED, populated);

    const message = mailResult.success
      ? 'Faculty created successfully. Official credentials dispatched to personal email.'
      : 'Faculty created successfully. Note: Credential email delivery encountered an issue; you can use Resend Credentials at any time.';

    return successResponse(res, populated, message, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update Faculty details and assignments
 * PUT /api/v1/admin/faculty/:id
 */
const updateFaculty = async (req, res, next) => {
  try {
    const {
      fullName,
      personalEmail,
      phone,
      designation,
      department,
      assignedSubjects,
      assignedSections,
      status
    } = req.body;

    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    if (personalEmail && personalEmail.trim().toLowerCase() !== faculty.personalEmail) {
      const duplicate = await Faculty.findOne({
        _id: { $ne: req.params.id },
        personalEmail: personalEmail.trim().toLowerCase()
      });
      if (duplicate) {
        return errorResponse(res, `Personal email '${personalEmail.trim().toLowerCase()}' is already in use.`, 409);
      }
      faculty.personalEmail = personalEmail.trim().toLowerCase();
    }

    if (fullName) faculty.fullName = fullName.trim();
    if (phone) faculty.phone = phone.trim();
    if (designation) faculty.designation = designation.trim();
    if (department) faculty.department = department.trim();
    if (assignedSubjects !== undefined) faculty.assignedSubjects = assignedSubjects;
    if (assignedSections !== undefined) faculty.assignedSections = assignedSections;
    if (status) faculty.status = status.toUpperCase();

    await faculty.save();

    const populated = await Faculty.findById(faculty._id)
      .populate('assignedSubjects', 'name code')
      .populate('assignedSections', 'name');

    academicEvents.emit(ACADEMIC_EVENTS.FACULTY_UPDATED, populated);

    return successResponse(res, populated, 'Faculty member updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete / Deactivate Faculty with referential integrity guard
 * DELETE /api/v1/admin/faculty/:id
 */
const deleteFaculty = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    // Check if faculty is referenced in any timetable sessions
    const timetableCount = await TimetableEntry.countDocuments({
      faculty: req.params.id,
      status: 'ACTIVE'
    });

    if (timetableCount > 0) {
      return errorResponse(
        res,
        `Cannot delete faculty member '${faculty.fullName}'. They are currently assigned to ${timetableCount} active timetable session(s). Please reassign or delete these sessions, or deactivate the faculty status to INACTIVE instead.`,
        400
      );
    }

    await faculty.deleteOne();
    return successResponse(res, null, `Faculty '${faculty.fullName}' deleted successfully`);
  } catch (error) {
    next(error);
  }
};

/**
 * Resend Credentials to Faculty Personal Email
 * POST /api/v1/admin/faculty/:id/resend-credentials
 */
const resendCredentials = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    const mailResult = await sendFacultyCredentialsEmail({
      fullName: faculty.fullName,
      personalEmail: faculty.personalEmail,
      officialEmail: faculty.officialEmail,
      temporaryPassword: DEFAULT_PASSWORD
    });

    faculty.lastEmailSentAt = new Date();
    faculty.emailDeliveryStatus = mailResult.success ? 'SENT' : 'FAILED';
    await faculty.save();

    if (mailResult.success) {
      return successResponse(
        res,
        {
          officialEmail: faculty.officialEmail,
          personalEmail: faculty.personalEmail,
          emailDeliveryStatus: faculty.emailDeliveryStatus
        },
        `Credentials successfully resent to ${faculty.personalEmail}.`
      );
    } else {
      return errorResponse(
        res,
        `Failed to deliver email: ${mailResult.error || 'SMTP Connection Error'}. Please verify mail configuration.`,
        500
      );
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get Weekly Timetable for a specific Faculty
 * GET /api/v1/admin/faculty/:id/timetable
 */
const getFacultyTimetable = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id).select('fullName facultyId officialEmail designation');
    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    const entries = await TimetableEntry.find({
      faculty: req.params.id,
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .populate('semester', 'name academicYear')
      .sort({ day: 1, 'period.order': 1 })
      .lean();

    return successResponse(res, { faculty, timetable: entries }, 'Faculty timetable retrieved');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFacultyList,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  resendCredentials,
  getFacultyTimetable
};
