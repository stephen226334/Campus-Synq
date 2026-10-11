const TimetableEntry = require('../models/TimetableEntry');
const Faculty = require('../models/Faculty');
const Period = require('../models/Period');
const Substitution = require('../models/Substitution');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const { successResponse, errorResponse } = require('../utils/response');
const { academicEvents, ACADEMIC_EVENTS } = require('../utils/eventEmitter');
const {
  DAYS_OF_WEEK,
  format12HourTime,
  formatAcademicDate,
  getPeriodStatus
} = require('../utils/timeHelper');

/**
 * Get unified faculty dashboard data
 * GET /api/v1/faculty/dashboard
 */
const getFacultyDashboard = async (req, res, next) => {
  try {
    const facultyId = req.user._id;
    const now = new Date();
    const todayIndex = now.getDay();
    const currentDay = DAYS_OF_WEEK[todayIndex];
    const dateMeta = formatAcademicDate(now);
    const currentTime12h = format12HourTime(now);

    // 1. Fetch all active timetable entries where this faculty is instructor or substitute
    const allWeeklyEntries = await TimetableEntry.find({
      $or: [{ faculty: facultyId }, { substituteFaculty: facultyId }],
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation department')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation department')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation department')
      .sort({ day: 1, 'period.order': 1 })
      .lean();

    // 2. Filter today's timetable entries
    const todayEntries = allWeeklyEntries
      .filter((entry) => entry.day === currentDay)
      .sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    // 3. Process each today's entry with dynamic period status
    let currentClass = null;
    let nextClass = null;

    const todaySchedule = todayEntries.map((entry) => {
      const periodStatus = getPeriodStatus(entry.period, now);
      const processed = {
        ...entry,
        statusLabel: periodStatus.status, // CURRENT, UPCOMING, COMPLETED
        minutesUntilStart: periodStatus.minutesUntilStart,
        minutesRemaining: periodStatus.minutesRemaining,
        isApproaching: periodStatus.isApproaching
      };

      if (periodStatus.status === 'CURRENT' && !currentClass) {
        currentClass = processed;
      }

      if (periodStatus.status === 'UPCOMING' && !nextClass) {
        nextClass = processed;
      }

      return processed;
    });

    // 4. Calculate distinct aggregate metrics
    const subjectIds = new Set();
    const sectionIds = new Set();
    const roomIds = new Set();

    allWeeklyEntries.forEach((entry) => {
      if (entry.subject?._id) subjectIds.add(entry.subject._id.toString());
      if (entry.section?._id) sectionIds.add(entry.section._id.toString());
      if (entry.roomId) roomIds.add(entry.roomId.toString());
    });

    // If faculty model has assigned subjects/sections, include them as well
    if (req.user.assignedSubjects?.length) {
      req.user.assignedSubjects.forEach((s) => subjectIds.add(s.toString()));
    }
    if (req.user.assignedSections?.length) {
      req.user.assignedSections.forEach((s) => sectionIds.add(s.toString()));
    }

    // 5. Structure Alert Notification if next class is approaching
    let nextClassAlert = null;
    if (nextClass && nextClass.isApproaching) {
      nextClassAlert = {
        title: 'Next Class Approaching',
        message: `Your next class starts at ${nextClass.period?.startTime || ''}.`,
        period: nextClass.period?.periodNumber,
        time: `${nextClass.period?.startTime} - ${nextClass.period?.endTime}`,
        subject: nextClass.subject?.name,
        section: nextClass.section?.name,
        room: nextClass.roomDetails?.roomNumber || 'Assigned Room',
        minutesRemaining: nextClass.minutesUntilStart
      };
    }

    let currentClassAlert = null;
    if (currentClass) {
      currentClassAlert = {
        title: 'Class In Session',
        period: currentClass.period?.periodNumber,
        time: `${currentClass.period?.startTime} - ${currentClass.period?.endTime}`,
        subject: currentClass.subject?.name,
        section: currentClass.section?.name,
        room: currentClass.roomDetails?.roomNumber || 'Assigned Room',
        minutesRemaining: currentClass.minutesRemaining
      };
    }

    return successResponse(
      res,
      {
        faculty: {
          id: req.user._id,
          facultyId: req.user.facultyId,
          fullName: req.user.fullName,
          officialEmail: req.user.officialEmail,
          personalEmail: req.user.personalEmail,
          designation: req.user.designation,
          department: req.user.department || 'Computer Science Department',
          role: req.user.role || 'FACULTY'
        },
        time: {
          currentDay,
          currentDate: dateMeta.formattedDate,
          fullDateDisplay: dateMeta.fullDisplay,
          currentTime12h,
          isoString: now.toISOString()
        },
        stats: {
          todayClassesCount: todayEntries.length,
          weeklyClassesCount: allWeeklyEntries.length,
          assignedSubjectsCount: subjectIds.size,
          assignedSectionsCount: sectionIds.size,
          assignedRoomsCount: roomIds.size
        },
        currentClass,
        nextClass,
        nextClassAlert,
        currentClassAlert,
        todaySchedule,
        weeklySchedule: allWeeklyEntries
      },
      'Faculty dashboard data loaded'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Today's schedule for authenticated faculty
 * GET /api/v1/faculty/timetable/today
 */
const getTodaySchedule = async (req, res, next) => {
  try {
    const facultyId = req.user._id;
    const now = new Date();
    const currentDay = DAYS_OF_WEEK[now.getDay()];

    const entries = await TimetableEntry.find({
      $or: [{ faculty: facultyId }, { substituteFaculty: facultyId }],
      day: currentDay,
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .sort({ 'period.order': 1 })
      .lean();

    const processed = entries.map((entry) => {
      const periodStatus = getPeriodStatus(entry.period, now);
      return {
        ...entry,
        statusLabel: periodStatus.status,
        minutesUntilStart: periodStatus.minutesUntilStart,
        minutesRemaining: periodStatus.minutesRemaining,
        isApproaching: periodStatus.isApproaching
      };
    });

    return successResponse(
      res,
      {
        day: currentDay,
        time: format12HourTime(now),
        count: processed.length,
        schedule: processed
      },
      `Today's timetable for ${req.user.fullName} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get Weekly timetable for authenticated faculty
 * GET /api/v1/faculty/timetable/weekly
 */
const getWeeklySchedule = async (req, res, next) => {
  try {
    const facultyId = req.user._id;

    const entries = await TimetableEntry.find({
      $or: [{ faculty: facultyId }, { substituteFaculty: facultyId }],
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .sort({ day: 1, 'period.order': 1 })
      .lean();

    return successResponse(
      res,
      entries,
      `Weekly timetable for ${req.user.fullName} retrieved`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get available substitute faculty members for a given day and period
 * GET /api/v1/faculty/available-substitutes
 */
const getAvailableSubstitutes = async (req, res, next) => {
  try {
    const { day, periodId } = req.query;

    if (!day || !periodId) {
      return errorResponse(res, 'Day and periodId are required query parameters.', 400);
    }

    // Find all active faculties except caller
    const faculties = await Faculty.find({
      _id: { $ne: req.user._id },
      status: 'ACTIVE'
    })
      .select('fullName facultyId officialEmail designation department')
      .sort({ fullName: 1 })
      .lean();

    // Check which faculties are occupied at this Day + Period
    const busyEntries = await TimetableEntry.find({
      day,
      period: periodId,
      status: 'ACTIVE'
    })
      .select('faculty substituteFaculty')
      .lean();

    const busyFacultyIds = new Set();
    busyEntries.forEach((entry) => {
      if (entry.faculty) busyFacultyIds.add(entry.faculty.toString());
      if (entry.substituteFaculty) busyFacultyIds.add(entry.substituteFaculty.toString());
    });

    const facultiesWithAvailability = faculties.map((f) => ({
      ...f,
      isAvailable: !busyFacultyIds.has(f._id.toString())
    }));

    return successResponse(
      res,
      facultiesWithAvailability,
      'Available substitute faculty retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Request or update class substitution
 * POST /api/v1/faculty/substitution
 */
const createSubstitution = async (req, res, next) => {
  try {
    const {
      timetableEntryId,
      substituteFacultyId,
      reason,
      date
    } = req.body;

    if (!timetableEntryId || !substituteFacultyId) {
      return errorResponse(res, 'Timetable session ID and substitute faculty ID are required.', 400);
    }

    // 1. Fetch target timetable entry
    const entry = await TimetableEntry.findById(timetableEntryId)
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .populate('faculty', 'fullName facultyId');

    if (!entry) {
      return errorResponse(res, 'Timetable entry not found.', 404);
    }

    // 2. Strict permission check: Faculty can only substitute their own classes
    const callerId = req.user._id.toString();
    const primaryFacultyId = entry.faculty?._id?.toString() || entry.faculty?.toString();

    if (primaryFacultyId !== callerId && req.user.role !== 'HOD_FACULTY') {
      return errorResponse(
        res,
        'Unauthorized. You can only manage substitutions for your own scheduled classes.',
        403
      );
    }

    // 3. Validation: substitute faculty cannot be the same as caller
    if (substituteFacultyId.toString() === callerId) {
      return errorResponse(res, 'Substitute faculty must be a different faculty member.', 400);
    }

    // 4. Verify substitute faculty exists and is active
    const substituteFaculty = await Faculty.findById(substituteFacultyId);
    if (!substituteFaculty || substituteFaculty.status !== 'ACTIVE') {
      return errorResponse(res, 'Selected substitute faculty is not active or does not exist.', 400);
    }

    // 5. Conflict Check: Is substitute faculty already assigned during this period?
    const substituteConflict = await TimetableEntry.findOne({
      day: entry.day,
      period: entry.period._id || entry.period,
      status: 'ACTIVE',
      _id: { $ne: entry._id },
      $or: [{ faculty: substituteFacultyId }, { substituteFaculty: substituteFacultyId }]
    });

    if (substituteConflict) {
      return errorResponse(
        res,
        'Faculty is already assigned during this period.',
        409,
        { conflictType: 'FACULTY' },
        {
          code: 'SUBSTITUTION_FACULTY_CONFLICT',
          details: { conflictType: 'FACULTY', facultyName: substituteFaculty.fullName },
          recommendation: 'Choose a different faculty member who does not have a scheduled class at this time.'
        }
      );
    }

    // 6. Conflict Check: Room availability
    const roomConflict = await TimetableEntry.findOne({
      day: entry.day,
      period: entry.period._id || entry.period,
      roomId: entry.roomId,
      status: 'ACTIVE',
      _id: { $ne: entry._id }
    });

    if (roomConflict) {
      const roomNum = entry.roomDetails?.roomNumber || 'Selected room';
      return errorResponse(
        res,
        `Room ${roomNum} is already occupied during this period.`,
        409,
        { conflictType: 'ROOM' },
        {
          code: 'SUBSTITUTION_ROOM_CONFLICT',
          details: { conflictType: 'ROOM', roomNumber: roomNum },
          recommendation: 'Select an available room or reschedule the substitution for an alternate period.'
        }
      );
    }

    // 7. Conflict Check: Section availability
    const sectionConflict = await TimetableEntry.findOne({
      day: entry.day,
      period: entry.period._id || entry.period,
      section: entry.section._id || entry.section,
      status: 'ACTIVE',
      _id: { $ne: entry._id }
    });

    if (sectionConflict) {
      const secName = entry.section?.name || 'Class section';
      return errorResponse(
        res,
        `${secName} already has another class scheduled during this period.`,
        409,
        { conflictType: 'SECTION' },
        {
          code: 'SUBSTITUTION_SECTION_CONFLICT',
          details: { conflictType: 'SECTION', sectionName: secName },
          recommendation: 'Check the class section schedule and pick an open slot.'
        }
      );
    }

    // 8. Update TimetableEntry with substitution details
    const substitutionDateString = date || new Date().toISOString().split('T')[0];

    entry.isSubstituted = true;
    entry.originalFaculty = entry.originalFaculty || entry.faculty;
    entry.substituteFaculty = substituteFacultyId;
    entry.substitutionReason = reason || 'Faculty class substitution';
    entry.substitutionDate = substitutionDateString;
    entry.substitutionStatus = 'SUBSTITUTED';

    await entry.save();

    // 9. Record substitution in Substitution collection
    const substitutionRecord = await Substitution.create({
      timetableEntry: entry._id,
      day: entry.day,
      date: substitutionDateString,
      period: entry.period._id || entry.period,
      originalFaculty: entry.originalFaculty,
      substituteFaculty: substituteFacultyId,
      subject: entry.subject._id || entry.subject,
      section: entry.section._id || entry.section,
      roomType: entry.roomType,
      roomId: entry.roomId,
      roomDetails: entry.roomDetails,
      reason: reason || 'Faculty class substitution',
      status: 'CONFIRMED',
      createdBy: req.user._id
    });

    // 10. Populate updated timetable record for response & broadcast
    const populated = await TimetableEntry.findById(entry._id)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .lean();

    // 11. Emit real-time events for live dashboard synchronization
    academicEvents.emit(ACADEMIC_EVENTS.SUBSTITUTION_UPDATED, {
      timetableEntry: populated,
      substitution: substitutionRecord,
      updatedBy: req.user.fullName
    });
    academicEvents.emit(ACADEMIC_EVENTS.TIMETABLE_UPDATED, populated);

    return successResponse(
      res,
      {
        timetableEntry: populated,
        substitution: substitutionRecord
      },
      'Substitution updated successfully.',
      200
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all substitution records for authenticated faculty
 * GET /api/v1/faculty/substitutions
 */
const getFacultySubstitutions = async (req, res, next) => {
  try {
    const facultyId = req.user._id;

    const substitutions = await Substitution.find({
      $or: [{ originalFaculty: facultyId }, { substituteFaculty: facultyId }, { createdBy: facultyId }]
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .populate('originalFaculty', 'fullName facultyId officialEmail')
      .populate('substituteFaculty', 'fullName facultyId officialEmail')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(res, substitutions, 'Substitutions retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Server-Sent Events (SSE) stream for instant real-time timetable & substitution updates
 * GET /api/v1/faculty/events
 */
const streamEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial ping
  res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

  const handleUpdate = (eventName) => (data) => {
    res.write(`event: ${eventName.toLowerCase()}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onTimetableUpdate = handleUpdate('timetable_updated');
  const onSubstitutionUpdate = handleUpdate('substitution_updated');
  const onTimetableCreate = handleUpdate('timetable_created');
  const onTimetableDelete = handleUpdate('timetable_deleted');

  academicEvents.on(ACADEMIC_EVENTS.TIMETABLE_UPDATED, onTimetableUpdate);
  academicEvents.on(ACADEMIC_EVENTS.SUBSTITUTION_UPDATED, onSubstitutionUpdate);
  academicEvents.on(ACADEMIC_EVENTS.TIMETABLE_CREATED, onTimetableCreate);
  academicEvents.on(ACADEMIC_EVENTS.TIMETABLE_DELETED, onTimetableDelete);

  req.on('close', () => {
    academicEvents.removeListener(ACADEMIC_EVENTS.TIMETABLE_UPDATED, onTimetableUpdate);
    academicEvents.removeListener(ACADEMIC_EVENTS.SUBSTITUTION_UPDATED, onSubstitutionUpdate);
    academicEvents.removeListener(ACADEMIC_EVENTS.TIMETABLE_CREATED, onTimetableCreate);
    academicEvents.removeListener(ACADEMIC_EVENTS.TIMETABLE_DELETED, onTimetableDelete);
  });
};

module.exports = {
  getFacultyDashboard,
  getTodaySchedule,
  getWeeklySchedule,
  getAvailableSubstitutes,
  createSubstitution,
  getFacultySubstitutions,
  streamEvents
};
