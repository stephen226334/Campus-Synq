const TimetableEntry = require('../models/TimetableEntry');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const { validateTimetableConflicts } = require('../services/conflictService');
const { successResponse, errorResponse } = require('../utils/response');
const { academicEvents, ACADEMIC_EVENTS } = require('../utils/eventEmitter');

/**
 * Helper to fetch room entity and snapshot details based on roomType
 */
const resolveRoomDetails = async (roomType, roomId) => {
  let roomDoc = null;
  let roomNumber = '';
  let name = '';
  let capacity = 0;

  if (roomType === 'Classroom') {
    roomDoc = await Classroom.findById(roomId);
    if (roomDoc) {
      roomNumber = roomDoc.roomNumber;
      name = `Classroom ${roomDoc.roomNumber}`;
      capacity = roomDoc.capacity;
    }
  } else if (roomType === 'Lab') {
    roomDoc = await Lab.findById(roomId);
    if (roomDoc) {
      roomNumber = roomDoc.labNumber;
      name = roomDoc.labName;
      capacity = roomDoc.capacity;
    }
  } else if (roomType === 'Auditorium') {
    roomDoc = await Auditorium.findById(roomId);
    if (roomDoc) {
      roomNumber = roomDoc.auditoriumNumber;
      name = roomDoc.auditoriumName;
      capacity = roomDoc.capacity;
    }
  }

  if (!roomDoc) {
    return null;
  }

  return {
    roomDoc,
    roomDetails: {
      roomNumber,
      name,
      capacity
    }
  };
};

/**
 * Get all timetable entries with flexible filtering
 * GET /api/v1/admin/timetable
 */
const getTimetableEntries = async (req, res, next) => {
  try {
    const { day, semester, section, faculty, roomId, subject, status = 'ACTIVE' } = req.query;
    const query = {};

    if (status && status !== 'ALL') {
      query.status = status;
    }

    if (day) query.day = day;
    if (semester) query.semester = semester;
    if (section) query.section = section;
    if (faculty) query.faculty = faculty;
    if (roomId) query.roomId = roomId;
    if (subject) query.subject = subject;

    const entries = await TimetableEntry.find(query)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .sort({ day: 1, 'period.order': 1 })
      .lean();

    return successResponse(res, entries, 'Timetable schedule retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get single timetable entry by ID
 * GET /api/v1/admin/timetable/:id
 */
const getTimetableEntryById = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findById(req.params.id)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation');

    if (!entry) {
      return errorResponse(res, 'Timetable entry not found', 404);
    }

    return successResponse(res, entry, 'Timetable entry retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new timetable entry with conflict verification
 * POST /api/v1/admin/timetable
 */
const createTimetableEntry = async (req, res, next) => {
  try {
    const {
      day,
      period,
      semester,
      section,
      subject,
      faculty,
      roomType,
      roomId,
      status = 'ACTIVE'
    } = req.body;

    // Resolve room details
    const resolved = await resolveRoomDetails(roomType, roomId);
    if (!resolved) {
      return errorResponse(res, `Selected ${roomType} was not found in Master Data.`, 400);
    }

    // Run conflict validation
    const conflictResult = await validateTimetableConflicts({
      day,
      periodId: period,
      facultyId: faculty,
      roomId,
      sectionId: section
    });

    if (conflictResult.hasConflict) {
      return errorResponse(res, conflictResult.message, 409, {
        conflictType: conflictResult.conflictType
      });
    }

    // Create entry
    const entry = new TimetableEntry({
      day,
      period,
      semester,
      section,
      subject,
      faculty,
      roomType,
      roomId,
      roomDetails: resolved.roomDetails,
      status
    });

    await entry.save();

    const populated = await TimetableEntry.findById(entry._id)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation');

    academicEvents.emit(ACADEMIC_EVENTS.TIMETABLE_CREATED, populated);

    return successResponse(res, populated, 'Timetable session scheduled successfully', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing timetable entry with conflict verification
 * PUT /api/v1/admin/timetable/:id
 */
const updateTimetableEntry = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findById(req.params.id);
    if (!entry) {
      return errorResponse(res, 'Timetable entry not found', 404);
    }

    const {
      day = entry.day,
      period = entry.period,
      semester = entry.semester,
      section = entry.section,
      subject = entry.subject,
      faculty = entry.faculty,
      roomType = entry.roomType,
      roomId = entry.roomId,
      status = entry.status
    } = req.body;

    // Resolve room details if room changed or refresh
    const resolved = await resolveRoomDetails(roomType, roomId);
    if (!resolved) {
      return errorResponse(res, `Selected ${roomType} was not found in Master Data.`, 400);
    }

    // Run conflict check excluding self
    const conflictResult = await validateTimetableConflicts({
      day,
      periodId: period,
      facultyId: faculty,
      roomId,
      sectionId: section,
      excludeEntryId: req.params.id
    });

    if (conflictResult.hasConflict) {
      return errorResponse(res, conflictResult.message, 409, {
        conflictType: conflictResult.conflictType
      });
    }

    entry.day = day;
    entry.period = period;
    entry.semester = semester;
    entry.section = section;
    entry.subject = subject;
    entry.faculty = faculty;
    entry.roomType = roomType;
    entry.roomId = roomId;
    entry.roomDetails = resolved.roomDetails;
    entry.status = status;

    await entry.save();

    const populated = await TimetableEntry.findById(entry._id)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation');

    academicEvents.emit(ACADEMIC_EVENTS.TIMETABLE_UPDATED, populated);

    return successResponse(res, populated, 'Timetable session updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a timetable entry
 * DELETE /api/v1/admin/timetable/:id
 */
const deleteTimetableEntry = async (req, res, next) => {
  try {
    const entry = await TimetableEntry.findById(req.params.id);
    if (!entry) {
      return errorResponse(res, 'Timetable entry not found', 404);
    }

    await entry.deleteOne();
    academicEvents.emit(ACADEMIC_EVENTS.TIMETABLE_DELETED, { id: req.params.id });

    return successResponse(res, null, 'Timetable session deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Today's classes based on real server weekday
 * GET /api/v1/admin/timetable/today
 */
const getTodayClasses = async (req, res, next) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const todayWeekday = days[todayIndex];

    const classes = await TimetableEntry.find({
      day: todayWeekday,
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId designation')
      .sort({ 'period.order': 1 })
      .lean();

    return successResponse(
      res,
      {
        weekday: todayWeekday,
        count: classes.length,
        classes
      },
      `Today's classes (${todayWeekday}) retrieved`
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTimetableEntries,
  getTimetableEntryById,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  getTodayClasses
};
