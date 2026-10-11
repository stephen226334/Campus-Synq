const Faculty = require('../models/Faculty');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const Semester = require('../models/Semester');
const ClassSection = require('../models/ClassSection');
const Period = require('../models/Period');
const TimetableEntry = require('../models/TimetableEntry');
const Substitution = require('../models/Substitution');
const Admin = require('../models/Admin');
const { successResponse, errorResponse } = require('../utils/response');
const { academicEvents, ACADEMIC_EVENTS } = require('../utils/eventEmitter');
const { DAYS_OF_WEEK, format12HourTime, formatAcademicDate, getPeriodStatus, findPeriodForTime, getCurrentAcademicStatus } = require('../utils/timeHelper');

/**
 * DEAN DASHBOARD
 * GET /api/v1/dean/dashboard
 */
const getDeanDashboard = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const todayDateStr = now.toISOString().split('T')[0];

    // 1. Real MongoDB Summary Counts
    const [
      totalFaculty,
      activeFaculty,
      totalSubjects,
      totalClassrooms,
      totalSemesters,
      totalSections,
      totalLabs,
      totalAuditoriums,
      activeTimetableSessions,
      todayClassesCount,
      pendingSubstitutionsCount,
      activeSubstitutionsCount,
      todaySubstitutionsCount,
      completedSubstitutionsCount
    ] = await Promise.all([
      Faculty.countDocuments(),
      Faculty.countDocuments({ status: 'ACTIVE' }),
      Subject.countDocuments(),
      Classroom.countDocuments(),
      Semester.countDocuments(),
      ClassSection.countDocuments(),
      Lab.countDocuments(),
      Auditorium.countDocuments(),
      TimetableEntry.countDocuments({ status: 'ACTIVE' }),
      TimetableEntry.countDocuments({ day: todayDay, status: 'ACTIVE' }),
      Substitution.countDocuments({ status: 'PENDING' }),
      Substitution.countDocuments({ status: 'CONFIRMED' }),
      Substitution.countDocuments({ date: todayDateStr }),
      Substitution.countDocuments({ status: 'CANCELLED' })
    ]);

    // 2. Fetch all active timetable entries for today's day
    const todayEntries = await TimetableEntry.find({ day: todayDay, status: 'ACTIVE' })
      .populate('period')
      .populate('subject', 'name code type credits')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name capacity')
      .populate('semester', 'name academicYear')
      .lean();

    // Sort by period order
    todayEntries.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    // 3. Process each entry for Live status & 12-hour period representation
    const currentlyActiveClasses = [];
    const todaySchedule = todayEntries.map((entry) => {
      const periodStatus = getPeriodStatus(entry.period, now);
      const isLive = periodStatus.status === 'CURRENT';

      const effectiveFaculty = entry.isSubstituted && entry.substituteFaculty
        ? entry.substituteFaculty
        : entry.faculty;

      const scheduleItem = {
        _id: entry._id,
        period: entry.period?.periodNumber || 'P1',
        time: `${entry.period?.startTime || ''} - ${entry.period?.endTime || ''}`,
        periodOrder: entry.period?.order || 1,
        subject: entry.subject?.name || 'Class',
        subjectCode: entry.subject?.code || '',
        faculty: effectiveFaculty?.fullName || 'Faculty',
        facultyId: effectiveFaculty?.facultyId || '',
        facultyEmail: effectiveFaculty?.officialEmail || '',
        originalFaculty: entry.isSubstituted ? entry.originalFaculty?.fullName : null,
        isSubstituted: !!entry.isSubstituted,
        section: entry.section?.name || 'Section',
        room: entry.roomDetails?.roomNumber || 'Room',
        roomType: entry.roomType,
        semester: entry.semester?.name || '',
        status: isLive ? 'LIVE' : periodStatus.status, // LIVE, UPCOMING, COMPLETED
        minutesRemaining: periodStatus.minutesRemaining,
        minutesUntilStart: periodStatus.minutesUntilStart
      };

      if (isLive) {
        currentlyActiveClasses.push(scheduleItem);
      }

      return scheduleItem;
    });

    // 4. Live Academic Overview & Room / Faculty Utilization Calculation
    const totalRooms = totalClassrooms + totalLabs + totalAuditoriums;
    const occupiedRoomsNow = new Set(currentlyActiveClasses.map(c => c.room)).size;
    const freeRoomsNow = Math.max(0, totalRooms - occupiedRoomsNow);
    const facultyInClassNow = new Set(currentlyActiveClasses.map(c => c.facultyId || c.faculty)).size;
    const freeFacultyNow = Math.max(0, activeFaculty - facultyInClassNow);

    // Scheduled occupancy for today
    const occupiedRoomsToday = new Set(todaySchedule.map(c => c.room)).size;
    const freeRoomsToday = Math.max(0, totalRooms - occupiedRoomsToday);
    const facultyInClassToday = new Set(todaySchedule.map(c => c.facultyId || c.faculty)).size;
    const freeFacultyToday = Math.max(0, activeFaculty - facultyInClassToday);

    const liveOverviewStats = {
      totalClasses: todaySchedule.length || todayClassesCount || activeTimetableSessions,
      classesRunningNow: currentlyActiveClasses.length,
      freeRooms: freeRoomsNow,
      occupiedRooms: occupiedRoomsNow,
      facultyInClass: facultyInClassNow,
      freeFaculty: freeFacultyNow,
      totalRooms,
      scheduledOccupiedRoomsToday: occupiedRoomsToday,
      scheduledFreeRoomsToday: freeRoomsToday,
      scheduledFacultyToday: facultyInClassToday,
      scheduledFreeFacultyToday: freeFacultyToday
    };

    // 5. Recent Substitutions Overview
    const recentSubstitutions = await Substitution.find()
      .populate('period')
      .populate('subject', 'name code')
      .populate('originalFaculty', 'fullName facultyId officialEmail')
      .populate('substituteFaculty', 'fullName facultyId officialEmail')
      .populate('section', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return successResponse(
      res,
      {
        liveStats: liveOverviewStats,
        metrics: {
          totalFaculty,
          activeFaculty,
          totalSubjects,
          totalClassrooms,
          totalSemesters,
          totalSections,
          totalLabs,
          totalAuditoriums,
          activeTimetableSessions,
          todayClassesCount: liveOverviewStats.totalClasses,
          pendingSubstitutionsCount,
          activeSubstitutionsCount,
          todaySubstitutionsCount,
          completedSubstitutionsCount
        },
        currentAcademicContext: {
          todayDay,
          formattedDate: formatAcademicDate(now).fullDisplay,
          currentTime12: format12HourTime(now),
          department: 'Computer Science Department'
        },
        currentlyActiveClasses,
        todaySchedule,
        recentSubstitutions
      },
      'Dean Dashboard overview retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * QUICK SEARCH SUGGESTIONS (Dashboard Top Bar)
 * GET /api/v1/dean/quick-search?q=:query
 */
const getQuickSearchSuggestions = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return successResponse(res, { suggestions: [] }, 'Empty query');
    }
    const term = q.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [classrooms, labs, faculties, subjects, sections] = await Promise.all([
      Classroom.find({ roomNumber: regex }).limit(4).lean(),
      Lab.find({ $or: [{ labNumber: regex }, { labName: regex }] }).limit(3).lean(),
      Faculty.find({ $or: [{ fullName: regex }, { facultyId: regex }, { officialEmail: regex }] }).limit(4).lean(),
      Subject.find({ $or: [{ name: regex }, { code: regex }] }).limit(4).lean(),
      ClassSection.find({ name: regex }).limit(3).lean()
    ]);

    const suggestions = [];

    // Rooms
    classrooms.forEach(r => {
      suggestions.push({
        type: 'ROOM',
        id: r._id,
        title: `Room ${r.roomNumber}`,
        subtitle: `${r.name || 'Classroom'} • Capacity: ${r.capacity || 60}`,
        url: `/dean/room-search?room=${encodeURIComponent(r.roomNumber)}`,
        entityId: r._id,
        category: 'CLASSROOMS'
      });
    });
    labs.forEach(l => {
      suggestions.push({
        type: 'ROOM',
        id: l._id,
        title: `Lab ${l.labNumber}`,
        subtitle: `${l.labName} • Capacity: ${l.capacity || 40}`,
        url: `/dean/room-search?room=${encodeURIComponent(l.labNumber)}`,
        entityId: l._id,
        category: 'LABS'
      });
    });

    // Faculty
    faculties.forEach(f => {
      suggestions.push({
        type: 'FACULTY',
        id: f._id,
        title: f.fullName,
        subtitle: `${f.designation} • ${f.facultyId || f.officialEmail}`,
        url: `/dean/faculty-search?faculty=${encodeURIComponent(f.fullName)}`,
        entityId: f._id,
        category: 'FACULTY'
      });
    });

    // Subjects
    subjects.forEach(s => {
      suggestions.push({
        type: 'SUBJECT',
        id: s._id,
        title: s.name,
        subtitle: `Code: ${s.code} • ${s.type}`,
        url: `/dean/timetable?subject=${encodeURIComponent(s.name)}`,
        entityId: s._id,
        category: 'SUBJECTS'
      });
    });

    // Sections
    sections.forEach(sec => {
      suggestions.push({
        type: 'CLASS',
        id: sec._id,
        title: sec.name,
        subtitle: `Class Section • Capacity: ${sec.capacity || 60}`,
        url: `/dean/class-search?class=${encodeURIComponent(sec.name)}`,
        entityId: sec._id,
        category: 'SECTIONS'
      });
    });

    return successResponse(res, { suggestions }, 'Suggestions retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH 1 — CLASS-WISE SEARCH
 * GET /api/v1/dean/class-wise?room=:room&day=:day&time=:time&class=:className
 */
const getClassWiseSearch = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    let { room, day, time, class: className } = req.query;

    if (!day || !day.trim()) day = todayDay;
    if (!time || !time.trim()) time = '10:00 AM';

    const periods = await Period.find({ status: 'ACTIVE' }).sort({ order: 1 }).lean();
    const matchedPeriod = findPeriodForTime(time, periods) || periods[0];

    // Find the room
    let roomDoc = null;
    let roomType = 'Classroom';
    if (room && room.trim()) {
      const roomRegex = new RegExp(room.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      roomDoc = await Classroom.findOne({ roomNumber: roomRegex }).lean();
      if (!roomDoc) {
        roomDoc = await Lab.findOne({ $or: [{ labNumber: roomRegex }, { labName: roomRegex }] }).lean();
        if (roomDoc) roomType = 'Lab';
      }
      if (!roomDoc) {
        roomDoc = await Auditorium.findOne({ $or: [{ auditoriumNumber: roomRegex }, { auditoriumName: roomRegex }] }).lean();
        if (roomDoc) roomType = 'Auditorium';
      }
    }

    if (!roomDoc && !className) {
      roomDoc = await Classroom.findOne({ roomNumber: 'B314' }).lean() || await Classroom.findOne().lean();
    }

    const query = { day, status: 'ACTIVE' };
    if (matchedPeriod) {
      query.period = matchedPeriod._id;
    }
    if (roomDoc) {
      query.roomId = roomDoc._id;
    }
    if (className && className.trim()) {
      const secRegex = new RegExp(className.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const sec = await ClassSection.findOne({ name: secRegex }).lean();
      if (sec) query.section = sec._id;
    }

    const entry = await TimetableEntry.findOne(query)
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name')
      .lean();

    const roomNumber = roomDoc?.roomNumber || roomDoc?.labNumber || roomDoc?.auditoriumNumber || room || 'Room';

    if (entry) {
      const effectiveFaculty = entry.isSubstituted && entry.substituteFaculty
        ? entry.substituteFaculty
        : entry.faculty;

      return successResponse(res, {
        isOccupied: true,
        status: 'OCCUPIED',
        roomNumber,
        roomName: roomDoc?.name || roomDoc?.labName || roomDoc?.auditoriumName || roomNumber,
        roomType: entry.roomType || roomType,
        capacity: roomDoc?.capacity || 60,
        day,
        period: entry.period?.periodNumber || matchedPeriod?.periodNumber || 'P1',
        time: `${entry.period?.startTime || ''} - ${entry.period?.endTime || ''}`,
        className: entry.section?.name || 'Class',
        subject: entry.subject?.name || 'Subject',
        subjectCode: entry.subject?.code || '',
        faculty: effectiveFaculty?.fullName || 'Faculty',
        facultyId: effectiveFaculty?.facultyId || '',
        facultyEmail: effectiveFaculty?.officialEmail || '',
        isSubstituted: !!entry.isSubstituted,
        substituteFaculty: entry.isSubstituted ? entry.substituteFaculty?.fullName : null,
        periodOrder: entry.period?.order || 1
      }, 'Class-wise search result retrieved');
    } else {
      return successResponse(res, {
        isOccupied: false,
        status: 'FREE',
        roomNumber,
        roomName: roomDoc?.name || roomDoc?.labName || roomDoc?.auditoriumName || roomNumber,
        roomType,
        capacity: roomDoc?.capacity || 60,
        day,
        period: matchedPeriod?.periodNumber || 'P1',
        time: matchedPeriod ? `${matchedPeriod.startTime} - ${matchedPeriod.endTime}` : time,
        className: null,
        subject: null,
        faculty: null,
        message: 'No class is scheduled during this period.'
      }, 'Room is FREE during this period');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH 2 — ROOM-WISE SEARCH
 * GET /api/v1/dean/room-wise?room=:room&day=:day
 */
const getRoomWiseSearch = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    let { room, day } = req.query;

    if (!day || !day.trim()) day = todayDay;

    let roomDoc = null;
    let roomType = 'Classroom';
    if (room && room.trim()) {
      const roomRegex = new RegExp(room.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      roomDoc = await Classroom.findOne({ roomNumber: roomRegex }).lean();
      if (!roomDoc) {
        roomDoc = await Lab.findOne({ $or: [{ labNumber: roomRegex }, { labName: roomRegex }] }).lean();
        if (roomDoc) roomType = 'Lab';
      }
      if (!roomDoc) {
        roomDoc = await Auditorium.findOne({ $or: [{ auditoriumNumber: roomRegex }, { auditoriumName: roomRegex }] }).lean();
        if (roomDoc) roomType = 'Auditorium';
      }
    }

    if (!roomDoc) {
      roomDoc = await Classroom.findOne({ roomNumber: 'B314' }).lean() || await Classroom.findOne().lean();
    }

    const periods = await Period.find({ status: 'ACTIVE' }).sort({ order: 1 }).lean();

    const entries = await TimetableEntry.find({
      day,
      roomId: roomDoc._id,
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name')
      .lean();

    const entryByPeriod = {};
    entries.forEach(e => {
      if (e.period?._id) {
        entryByPeriod[e.period._id.toString()] = e;
      }
    });

    const roomNumber = roomDoc.roomNumber || roomDoc.labNumber || roomDoc.auditoriumNumber;

    const timetableRows = periods.map(p => {
      const e = entryByPeriod[p._id.toString()];
      const isCurrentPeriod = getPeriodStatus(p, now).status === 'CURRENT' && day === todayDay;

      if (e) {
        const effectiveFaculty = e.isSubstituted && e.substituteFaculty
          ? e.substituteFaculty
          : e.faculty;

        return {
          periodId: p._id,
          period: p.periodNumber,
          time: `${p.startTime} - ${p.endTime}`,
          className: e.section?.name || 'Class',
          subject: e.subject?.name || 'Subject',
          subjectCode: e.subject?.code || '',
          faculty: effectiveFaculty?.fullName || 'Faculty',
          facultyId: effectiveFaculty?.facultyId || '',
          status: 'OCCUPIED',
          isLive: isCurrentPeriod,
          isSubstituted: !!e.isSubstituted,
          substituteFaculty: e.isSubstituted ? e.substituteFaculty?.fullName : null
        };
      } else {
        return {
          periodId: p._id,
          period: p.periodNumber,
          time: `${p.startTime} - ${p.endTime}`,
          className: '—',
          subject: '—',
          subjectCode: '—',
          faculty: '—',
          facultyId: null,
          status: 'FREE',
          isLive: false,
          isSubstituted: false
        };
      }
    });

    return successResponse(res, {
      room: {
        _id: roomDoc._id,
        roomNumber,
        name: roomDoc.name || roomDoc.labName || roomDoc.auditoriumName,
        roomType,
        capacity: roomDoc.capacity || 60,
        floor: roomDoc.floor || ''
      },
      day,
      timetable: timetableRows
    }, 'Room-wise timetable retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH 3 — FACULTY-WISE SEARCH
 * GET /api/v1/dean/faculty-wise?faculty=:faculty&day=:day
 */
const getFacultyWiseSearch = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const { faculty: facultyQuery, day } = req.query;

    let facultyDoc = null;
    if (facultyQuery && facultyQuery.trim()) {
      const regex = new RegExp(facultyQuery.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      facultyDoc = await Faculty.findOne({
        $or: [{ fullName: regex }, { facultyId: regex }, { officialEmail: regex }]
      }).populate('assignedSubjects', 'name code').populate('assignedSections', 'name').lean();
    }

    if (!facultyDoc) {
      facultyDoc = await Faculty.findOne({ fullName: /Ravi/i }).populate('assignedSubjects', 'name code').populate('assignedSections', 'name').lean()
        || await Faculty.findOne().populate('assignedSubjects', 'name code').populate('assignedSections', 'name').lean();
    }

    // Determine current live status for this faculty right now
    const todayEntries = await TimetableEntry.find({
      day: todayDay,
      $or: [{ faculty: facultyDoc._id }, { substituteFaculty: facultyDoc._id }],
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .lean();

    let currentLiveEntry = null;
    let nextUpcomingEntry = null;

    for (const e of todayEntries) {
      const periodStatus = getPeriodStatus(e.period, now);
      if (periodStatus.status === 'CURRENT') {
        currentLiveEntry = e;
        break;
      } else if (periodStatus.status === 'UPCOMING' && !nextUpcomingEntry) {
        nextUpcomingEntry = e;
      }
    }

    let currentStatus = 'FREE';
    let currentStatusBadge = 'FREE';
    let currentStatusColor = 'green';
    let currentDetails = null;

    if (currentLiveEntry) {
      const isLab = currentLiveEntry.roomType === 'Lab';
      const roomNum = currentLiveEntry.roomDetails?.roomNumber || 'Room';
      currentStatus = isLab ? 'IN_LAB' : 'IN_CLASS';
      currentStatusBadge = isLab ? `IN LAB — ${roomNum}` : `IN CLASS — ${roomNum}`;
      currentStatusColor = isLab ? 'orange' : 'red';
      currentDetails = {
        room: roomNum,
        subject: currentLiveEntry.subject?.name || '',
        className: currentLiveEntry.section?.name || '',
        period: `${currentLiveEntry.period?.startTime} - ${currentLiveEntry.period?.endTime}`,
        periodNumber: currentLiveEntry.period?.periodNumber
      };
    }

    let nextStatusChange = 'FREE';
    if (currentLiveEntry) {
      nextStatusChange = `FREE at ${currentLiveEntry.period?.endTime}`;
    } else if (nextUpcomingEntry) {
      nextStatusChange = `CLASS at ${nextUpcomingEntry.period?.startTime} (${nextUpcomingEntry.roomDetails?.roomNumber || 'Room'})`;
    } else {
      nextStatusChange = 'No further classes today';
    }

    const scheduleQuery = {
      $or: [{ faculty: facultyDoc._id }, { substituteFaculty: facultyDoc._id }],
      status: 'ACTIVE'
    };
    if (day && day.trim()) {
      scheduleQuery.day = day.trim();
    }

    const scheduleEntries = await TimetableEntry.find(scheduleQuery)
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .lean();

    scheduleEntries.sort((a, b) => {
      const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
      const dDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
      if (dDiff !== 0) return dDiff;
      return (a.period?.order || 0) - (b.period?.order || 0);
    });

    const formattedSchedule = scheduleEntries.map(e => {
      const isLiveNow = e.day === todayDay && getPeriodStatus(e.period, now).status === 'CURRENT';
      return {
        _id: e._id,
        day: e.day,
        period: e.period?.periodNumber || 'P1',
        time: `${e.period?.startTime || ''} - ${e.period?.endTime || ''}`,
        className: e.section?.name || 'Class',
        subject: e.subject?.name || 'Subject',
        subjectCode: e.subject?.code || '',
        room: e.roomDetails?.roomNumber || 'Room',
        roomType: e.roomType,
        status: isLiveNow ? 'LIVE' : (e.roomType === 'Lab' ? 'LAB' : 'CLASS'),
        isLive: isLiveNow
      };
    });

    return successResponse(res, {
      faculty: {
        _id: facultyDoc._id,
        fullName: facultyDoc.fullName,
        facultyId: facultyDoc.facultyId,
        officialEmail: facultyDoc.officialEmail,
        personalEmail: facultyDoc.personalEmail,
        designation: facultyDoc.designation,
        department: facultyDoc.department,
        assignedSubjects: facultyDoc.assignedSubjects || [],
        assignedSections: facultyDoc.assignedSections || []
      },
      currentStatus,
      currentStatusBadge,
      currentStatusColor,
      currentDetails,
      nextStatusChange,
      schedule: formattedSchedule
    }, 'Faculty-wise timetable and live status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH 4 — FREE ROOMS SEARCH
 * GET /api/v1/dean/free-rooms?day=:day&time=:time
 */
const getFreeRoomsSearch = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    let { day, time } = req.query;

    if (!day || !day.trim()) day = todayDay;
    if (!time || !time.trim()) time = '10:00 AM';

    const periods = await Period.find({ status: 'ACTIVE' }).sort({ order: 1 }).lean();
    const matchedPeriod = findPeriodForTime(time, periods) || periods[0];

    const [classrooms, labs] = await Promise.all([
      Classroom.find({ status: { $ne: 'MAINTENANCE' } }).lean(),
      Lab.find({ status: { $ne: 'MAINTENANCE' } }).lean()
    ]);

    const activeEntries = await TimetableEntry.find({
      day,
      period: matchedPeriod._id,
      status: 'ACTIVE'
    })
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId')
      .populate('substituteFaculty', 'fullName facultyId')
      .populate('section', 'name')
      .lean();

    const occupiedMap = new Map();
    activeEntries.forEach(e => {
      occupiedMap.set(e.roomId.toString(), e);
      if (e.roomDetails?.roomNumber) {
        occupiedMap.set(e.roomDetails.roomNumber.toUpperCase(), e);
      }
    });

    const availableRooms = [];
    const occupiedRooms = [];

    // Classrooms
    classrooms.forEach(r => {
      const entry = occupiedMap.get(r._id.toString()) || occupiedMap.get(r.roomNumber.toUpperCase());
      if (entry) {
        const effFaculty = entry.isSubstituted && entry.substituteFaculty ? entry.substituteFaculty : entry.faculty;
        occupiedRooms.push({
          roomId: r._id,
          roomNumber: r.roomNumber,
          name: r.name || `Classroom ${r.roomNumber}`,
          type: 'Classroom',
          capacity: r.capacity || 60,
          floor: r.floor || '',
          className: entry.section?.name || 'Class',
          subject: entry.subject?.name || 'Subject',
          faculty: effFaculty?.fullName || 'Faculty',
          period: matchedPeriod.periodNumber,
          time: `${matchedPeriod.startTime} - ${matchedPeriod.endTime}`
        });
      } else {
        availableRooms.push({
          roomId: r._id,
          roomNumber: r.roomNumber,
          name: r.name || `Classroom ${r.roomNumber}`,
          type: 'Classroom',
          capacity: r.capacity || 60,
          floor: r.floor || '',
          status: 'AVAILABLE'
        });
      }
    });

    // Labs
    labs.forEach(l => {
      const entry = occupiedMap.get(l._id.toString()) || occupiedMap.get(l.labNumber.toUpperCase());
      if (entry) {
        const effFaculty = entry.isSubstituted && entry.substituteFaculty ? entry.substituteFaculty : entry.faculty;
        occupiedRooms.push({
          roomId: l._id,
          roomNumber: l.labNumber,
          name: l.labName || `Lab ${l.labNumber}`,
          type: 'Lab',
          capacity: l.capacity || 40,
          floor: l.floor || '',
          className: entry.section?.name || 'Class',
          subject: entry.subject?.name || 'Subject',
          faculty: effFaculty?.fullName || 'Faculty',
          period: matchedPeriod.periodNumber,
          time: `${matchedPeriod.startTime} - ${matchedPeriod.endTime}`
        });
      } else {
        availableRooms.push({
          roomId: l._id,
          roomNumber: l.labNumber,
          name: l.labName || `Lab ${l.labNumber}`,
          type: 'Lab',
          capacity: l.capacity || 40,
          floor: l.floor || '',
          status: 'AVAILABLE'
        });
      }
    });

    return successResponse(res, {
      day,
      period: matchedPeriod.periodNumber,
      time: `${matchedPeriod.startTime} - ${matchedPeriod.endTime}`,
      availableRooms,
      occupiedRooms,
      totalAvailable: availableRooms.length,
      totalOccupied: occupiedRooms.length,
      totalRooms: availableRooms.length + occupiedRooms.length
    }, 'Free and occupied rooms calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * SEARCH 5 — CURRENT STATUS SEARCH
 * GET /api/v1/dean/current-status?q=:query
 */
const getCurrentStatusSearch = async (req, res, next) => {
  try {
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const currentTimeStr = format12HourTime(now);
    const { q } = req.query;

    const periods = await Period.find({ status: 'ACTIVE' }).sort({ order: 1 }).lean();
    let currentPeriod = null;
    let nextPeriod = null;

    for (const p of periods) {
      const pStat = getPeriodStatus(p, now);
      if (pStat.status === 'CURRENT') {
        currentPeriod = p;
      } else if (pStat.status === 'UPCOMING' && !nextPeriod) {
        nextPeriod = p;
      }
    }

    if (!q || !q.trim()) {
      const activeEntries = await TimetableEntry.find({
        day: todayDay,
        period: currentPeriod?._id,
        status: 'ACTIVE'
      })
        .populate('period')
        .populate('subject', 'name code')
        .populate('faculty', 'fullName facultyId')
        .populate('substituteFaculty', 'fullName facultyId')
        .populate('section', 'name')
        .lean();

      return successResponse(res, {
        currentTime: currentTimeStr,
        todayDay,
        currentPeriod: currentPeriod ? currentPeriod.periodNumber : null,
        currentPeriodTime: currentPeriod ? `${currentPeriod.startTime} - ${currentPeriod.endTime}` : 'Off hours',
        activeClassesCount: activeEntries.length,
        activeClasses: activeEntries.map(e => ({
          room: e.roomDetails?.roomNumber || 'Room',
          subject: e.subject?.name,
          faculty: (e.isSubstituted && e.substituteFaculty ? e.substituteFaculty : e.faculty)?.fullName,
          section: e.section?.name,
          time: `${e.period?.startTime} - ${e.period?.endTime}`,
          status: 'LIVE'
        }))
      }, 'Live status snapshot retrieved');
    }

    const term = q.trim();
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // 1. Match Room
    const roomDoc = await Classroom.findOne({ roomNumber: regex }).lean()
      || await Lab.findOne({ $or: [{ labNumber: regex }, { labName: regex }] }).lean();

    if (roomDoc) {
      const roomNum = roomDoc.roomNumber || roomDoc.labNumber;
      let occupiedEntry = null;

      if (currentPeriod) {
        occupiedEntry = await TimetableEntry.findOne({
          day: todayDay,
          period: currentPeriod._id,
          roomId: roomDoc._id,
          status: 'ACTIVE'
        })
          .populate('subject', 'name code')
          .populate('faculty', 'fullName facultyId')
          .populate('substituteFaculty', 'fullName facultyId')
          .populate('section', 'name')
          .lean();
      }

      let nextStatusChange = 'FREE';
      if (occupiedEntry && currentPeriod) {
        nextStatusChange = `FREE at ${currentPeriod.endTime}`;
      } else if (nextPeriod) {
        const nextOccupied = await TimetableEntry.findOne({
          day: todayDay,
          period: nextPeriod._id,
          roomId: roomDoc._id,
          status: 'ACTIVE'
        }).populate('subject', 'name').lean();

        if (nextOccupied) {
          nextStatusChange = `OCCUPIED at ${nextPeriod.startTime} (${nextOccupied.subject?.name || 'Class'})`;
        } else {
          nextStatusChange = 'FREE for remaining schedule today';
        }
      } else {
        nextStatusChange = 'No further classes today';
      }

      if (occupiedEntry) {
        const effFaculty = occupiedEntry.isSubstituted && occupiedEntry.substituteFaculty
          ? occupiedEntry.substituteFaculty
          : occupiedEntry.faculty;

        return successResponse(res, {
          entityType: 'ROOM',
          title: `ROOM ${roomNum}`,
          roomNumber: roomNum,
          roomName: roomDoc.name || roomDoc.labName,
          status: 'OCCUPIED',
          badgeColor: 'red',
          currentTime: currentTimeStr,
          period: `${currentPeriod.startTime} - ${currentPeriod.endTime}`,
          periodNumber: currentPeriod.periodNumber,
          className: occupiedEntry.section?.name || 'Class',
          subject: occupiedEntry.subject?.name || 'Subject',
          faculty: effFaculty?.fullName || 'Faculty',
          facultyId: effFaculty?.facultyId || '',
          nextStatusChange
        }, 'Room status retrieved');
      } else {
        return successResponse(res, {
          entityType: 'ROOM',
          title: `ROOM ${roomNum}`,
          roomNumber: roomNum,
          roomName: roomDoc.name || roomDoc.labName,
          status: 'FREE',
          badgeColor: 'green',
          currentTime: currentTimeStr,
          period: currentPeriod ? `${currentPeriod.startTime} - ${currentPeriod.endTime}` : 'Off hours',
          periodNumber: currentPeriod ? currentPeriod.periodNumber : null,
          className: null,
          subject: null,
          faculty: null,
          nextStatusChange
        }, 'Room is currently free');
      }
    }

    // 2. Match Faculty
    const facultyDoc = await Faculty.findOne({
      $or: [{ fullName: regex }, { facultyId: regex }, { officialEmail: regex }]
    }).lean();

    if (facultyDoc) {
      let activeClass = null;
      if (currentPeriod) {
        activeClass = await TimetableEntry.findOne({
          day: todayDay,
          period: currentPeriod._id,
          $or: [{ faculty: facultyDoc._id }, { substituteFaculty: facultyDoc._id }],
          status: 'ACTIVE'
        })
          .populate('subject', 'name code')
          .populate('section', 'name')
          .lean();
      }

      let nextStatusChange = 'FREE';
      if (activeClass && currentPeriod) {
        nextStatusChange = `FREE at ${currentPeriod.endTime}`;
      } else if (nextPeriod) {
        const upcomingClass = await TimetableEntry.findOne({
          day: todayDay,
          period: nextPeriod._id,
          $or: [{ faculty: facultyDoc._id }, { substituteFaculty: facultyDoc._id }],
          status: 'ACTIVE'
        }).populate('subject', 'name').lean();

        if (upcomingClass) {
          nextStatusChange = `IN CLASS at ${nextPeriod.startTime} (${upcomingClass.roomDetails?.roomNumber || 'Class'})`;
        } else {
          nextStatusChange = 'FREE for remaining schedule today';
        }
      } else {
        nextStatusChange = 'No further classes today';
      }

      if (activeClass) {
        const isLab = activeClass.roomType === 'Lab';
        return successResponse(res, {
          entityType: 'FACULTY',
          title: facultyDoc.fullName,
          status: isLab ? 'IN_LAB' : 'IN_CLASS',
          statusText: isLab ? `IN LAB — ${activeClass.roomDetails?.roomNumber}` : `IN CLASS — ${activeClass.roomDetails?.roomNumber}`,
          badgeColor: isLab ? 'orange' : 'red',
          currentTime: currentTimeStr,
          period: `${currentPeriod.startTime} - ${currentPeriod.endTime}`,
          periodNumber: currentPeriod.periodNumber,
          room: activeClass.roomDetails?.roomNumber,
          subject: activeClass.subject?.name,
          className: activeClass.section?.name,
          nextStatusChange
        }, 'Faculty status retrieved');
      } else {
        return successResponse(res, {
          entityType: 'FACULTY',
          title: facultyDoc.fullName,
          status: 'FREE',
          statusText: 'FREE',
          badgeColor: 'green',
          currentTime: currentTimeStr,
          period: currentPeriod ? `${currentPeriod.startTime} - ${currentPeriod.endTime}` : 'Off hours',
          periodNumber: currentPeriod ? currentPeriod.periodNumber : null,
          room: null,
          subject: null,
          className: null,
          nextStatusChange
        }, 'Faculty is currently free');
      }
    }

    return successResponse(res, {
      entityType: 'UNKNOWN',
      title: term,
      status: 'FREE',
      message: `No active records found for "${term}" right now.`
    }, 'Search completed');
  } catch (error) {
    next(error);
  }
};

/**
 * GLOBAL MULTI-ENTITY SEARCH
 * GET /api/v1/dean/search?q=:query&category=:category
 */
const globalSearch = async (req, res, next) => {
  try {
    const { q, category = 'ALL' } = req.query;

    if (!q || !q.trim()) {
      return successResponse(
        res,
        {
          query: '',
          totalCount: 0,
          categories: {},
          results: []
        },
        'Empty search query'
      );
    }

    const searchTerm = q.trim();
    const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const searchFaculty = category === 'ALL' || category === 'FACULTY';
    const searchSubjects = category === 'ALL' || category === 'SUBJECTS';
    const searchClassrooms = category === 'ALL' || category === 'CLASSROOMS';
    const searchLabs = category === 'ALL' || category === 'LABS';
    const searchAuditoriums = category === 'ALL' || category === 'AUDITORIUMS';
    const searchSemesters = category === 'ALL' || category === 'SEMESTERS';
    const searchSections = category === 'ALL' || category === 'SECTIONS';
    const searchTimetable = category === 'ALL' || category === 'TIMETABLE';
    const searchSubstitutions = category === 'ALL' || category === 'SUBSTITUTIONS';

    const [
      faculties,
      subjects,
      classrooms,
      labs,
      auditoriums,
      semesters,
      sections,
      timetableEntries,
      substitutions
    ] = await Promise.all([
      searchFaculty
        ? Faculty.find({
            $or: [
              { fullName: regex },
              { officialEmail: regex },
              { personalEmail: regex },
              { facultyId: regex },
              { designation: regex }
            ]
          })
            .populate('assignedSubjects', 'name code')
            .populate('assignedSections', 'name')
            .lean()
        : [],
      searchSubjects
        ? Subject.find({
            $or: [{ name: regex }, { code: regex }, { type: regex }]
          })
            .populate('semester', 'name academicYear')
            .lean()
        : [],
      searchClassrooms
        ? Classroom.find({ roomNumber: regex }).lean()
        : [],
      searchLabs
        ? Lab.find({
            $or: [{ labNumber: regex }, { labName: regex }]
          }).lean()
        : [],
      searchAuditoriums
        ? Auditorium.find({
            $or: [{ auditoriumNumber: regex }, { auditoriumName: regex }]
          }).lean()
        : [],
      searchSemesters
        ? Semester.find({
            $or: [{ name: regex }, { academicYear: regex }]
          }).lean()
        : [],
      searchSections
        ? ClassSection.find({ name: regex })
            .populate('semester', 'name academicYear')
            .lean()
        : [],
      searchTimetable
        ? TimetableEntry.find({
            $or: [
              { day: regex },
              { roomType: regex },
              { 'roomDetails.roomNumber': regex }
            ],
            status: 'ACTIVE'
          })
            .populate('period')
            .populate('subject', 'name code')
            .populate('faculty', 'fullName facultyId officialEmail')
            .populate('section', 'name')
            .populate('semester', 'name')
            .limit(10)
            .lean()
        : [],
      searchSubstitutions
        ? Substitution.find({
            $or: [
              { day: regex },
              { date: regex },
              { reason: regex },
              { 'roomDetails.roomNumber': regex }
            ]
          })
            .populate('period')
            .populate('subject', 'name code')
            .populate('originalFaculty', 'fullName facultyId')
            .populate('substituteFaculty', 'fullName facultyId')
            .populate('section', 'name')
            .limit(10)
            .lean()
        : []
    ]);

    // Format results by category
    const categorized = {
      FACULTY: faculties.map((f) => ({
        id: f._id,
        category: 'FACULTY',
        title: f.fullName,
        subtitle: `${f.designation} (${f.facultyId})`,
        email: f.officialEmail,
        badge: f.status,
        meta: `${f.assignedSubjects?.length || 0} Subjects • ${f.assignedSections?.length || 0} Sections`,
        raw: f
      })),
      SUBJECTS: subjects.map((s) => ({
        id: s._id,
        category: 'SUBJECTS',
        title: s.name,
        subtitle: `Code: ${s.code} • ${s.type || 'Theory'}`,
        badge: s.status || 'ACTIVE',
        meta: `Semester: ${s.semester?.name || 'N/A'} (${s.credits || 4} Credits)`,
        raw: s
      })),
      CLASSROOMS: classrooms.map((c) => ({
        id: c._id,
        category: 'CLASSROOMS',
        title: c.roomNumber,
        subtitle: `Capacity: ${c.capacity} Students`,
        badge: c.status,
        meta: `Classroom • Floor: ${c.floor || 'Standard'}`,
        raw: c
      })),
      LABS: labs.map((l) => ({
        id: l._id,
        category: 'LABS',
        title: l.labNumber,
        subtitle: l.labName || 'Computer Lab',
        badge: l.status,
        meta: `Capacity: ${l.capacity} • Floor: ${l.floor || 'Ground'}`,
        raw: l
      })),
      AUDITORIUMS: auditoriums.map((a) => ({
        id: a._id,
        category: 'AUDITORIUMS',
        title: a.auditoriumNumber,
        subtitle: a.auditoriumName,
        badge: a.status,
        meta: `Capacity: ${a.capacity} Seats`,
        raw: a
      })),
      SEMESTERS: semesters.map((sem) => ({
        id: sem._id,
        category: 'SEMESTERS',
        title: sem.name,
        subtitle: `Academic Year: ${sem.academicYear}`,
        badge: sem.status,
        meta: `Department of Computer Science`,
        raw: sem
      })),
      SECTIONS: sections.map((sec) => ({
        id: sec._id,
        category: 'SECTIONS',
        title: sec.name,
        subtitle: `Semester: ${sec.semester?.name || 'N/A'}`,
        badge: sec.status,
        meta: `Capacity: ${sec.capacity || 60} Students`,
        raw: sec
      })),
      TIMETABLE: timetableEntries.map((t) => ({
        id: t._id,
        category: 'TIMETABLE',
        title: `${t.subject?.name || 'Subject'} (${t.period?.periodNumber || 'P1'})`,
        subtitle: `${t.day} • ${t.period?.startTime || ''} - ${t.period?.endTime || ''}`,
        badge: t.roomDetails?.roomNumber || 'Room',
        meta: `Faculty: ${t.faculty?.fullName || 'N/A'} • Section: ${t.section?.name || 'N/A'}`,
        raw: t
      })),
      SUBSTITUTIONS: substitutions.map((sub) => ({
        id: sub._id,
        category: 'SUBSTITUTIONS',
        title: `${sub.subject?.name || 'Substitution'} (${sub.period?.periodNumber || 'Period'})`,
        subtitle: `Original: ${sub.originalFaculty?.fullName || ''} → Sub: ${sub.substituteFaculty?.fullName || ''}`,
        badge: sub.status,
        meta: `Date: ${sub.date} • Room: ${sub.roomDetails?.roomNumber || 'Assigned'}`,
        raw: sub
      }))
    };

    const allResults = Object.values(categorized).flat();

    return successResponse(
      res,
      {
        query: searchTerm,
        totalCount: allResults.length,
        categories: {
          facultyCount: categorized.FACULTY.length,
          subjectsCount: categorized.SUBJECTS.length,
          classroomsCount: categorized.CLASSROOMS.length,
          labsCount: categorized.LABS.length,
          auditoriumsCount: categorized.AUDITORIUMS.length,
          semestersCount: categorized.SEMESTERS.length,
          sectionsCount: categorized.SECTIONS.length,
          timetableCount: categorized.TIMETABLE.length,
          substitutionsCount: categorized.SUBSTITUTIONS.length
        },
        categorized,
        allResults
      },
      'Search results retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * FACULTY LIST & DETAILS INSPECTION
 * GET /api/v1/dean/faculty
 * GET /api/v1/dean/faculty/:id
 */
const getFacultyList = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { facultyId: { $regex: search, $options: 'i' } },
        { officialEmail: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } }
      ];
    }

    const faculty = await Faculty.find(query)
      .populate('assignedSubjects', 'name code credits')
      .populate('assignedSections', 'name')
      .sort({ fullName: 1 })
      .lean();

    // Attach total timetable sessions count for each faculty
    const facultyWithStats = await Promise.all(
      faculty.map(async (f) => {
        const sessionCount = await TimetableEntry.countDocuments({
          faculty: f._id,
          status: 'ACTIVE'
        });
        return {
          ...f,
          sessionCount
        };
      })
    );

    return successResponse(res, facultyWithStats, 'Faculty list retrieved');
  } catch (error) {
    next(error);
  }
};

const getFacultyDetails = async (req, res, next) => {
  try {
    const faculty = await Faculty.findById(req.params.id)
      .populate('assignedSubjects', 'name code credits type')
      .populate('assignedSections', 'name')
      .lean();

    if (!faculty) {
      return errorResponse(res, 'Faculty member not found', 404);
    }

    // Weekly timetable grouped by day
    const timetableEntries = await TimetableEntry.find({
      $or: [{ faculty: faculty._id }, { substituteFaculty: faculty._id }],
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('section', 'name')
      .populate('semester', 'name academicYear')
      .lean();

    timetableEntries.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    // Group by Day
    const weeklySchedule = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    const assignedRooms = new Set();

    timetableEntries.forEach((entry) => {
      if (weeklySchedule[entry.day]) {
        weeklySchedule[entry.day].push({
          _id: entry._id,
          period: entry.period?.periodNumber,
          startTime: entry.period?.startTime,
          endTime: entry.period?.endTime,
          timeFormatted: `${entry.period?.startTime} - ${entry.period?.endTime}`,
          subject: entry.subject?.name,
          subjectCode: entry.subject?.code,
          section: entry.section?.name,
          room: entry.roomDetails?.roomNumber,
          roomType: entry.roomType,
          isSubstituted: !!entry.isSubstituted,
          isSubstituteTeacher: entry.substituteFaculty?.toString() === faculty._id.toString()
        });
      }
      if (entry.roomDetails?.roomNumber) {
        assignedRooms.add(entry.roomDetails.roomNumber);
      }
    });

    // Today's classes
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const todayClasses = (weeklySchedule[todayDay] || []).map((c) => {
      const periodStatus = getPeriodStatus(
        { startTime: c.startTime, endTime: c.endTime, periodNumber: c.period },
        now
      );
      return {
        ...c,
        status: periodStatus.status
      };
    });

    // Substitutions for this faculty
    const substitutions = await Substitution.find({
      $or: [{ originalFaculty: faculty._id }, { substituteFaculty: faculty._id }]
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('originalFaculty', 'fullName facultyId')
      .populate('substituteFaculty', 'fullName facultyId')
      .populate('section', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return successResponse(
      res,
      {
        faculty,
        assignedRooms: Array.from(assignedRooms),
        weeklySchedule,
        todayClasses,
        substitutions,
        totalWeeklyHours: timetableEntries.length
      },
      'Faculty details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * SUBJECTS LIST & DETAILS
 * GET /api/v1/dean/subjects
 * GET /api/v1/dean/subjects/:id
 */
const getSubjectList = async (req, res, next) => {
  try {
    const subjects = await Subject.find()
      .populate('semester', 'name academicYear')
      .sort({ code: 1 })
      .lean();

    // Attach faculty teaching this subject and session count
    const subjectsWithDetails = await Promise.all(
      subjects.map(async (subj) => {
        const entries = await TimetableEntry.find({ subject: subj._id, status: 'ACTIVE' })
          .populate('faculty', 'fullName facultyId')
          .populate('section', 'name')
          .lean();

        const facultySet = new Map();
        const sectionSet = new Set();
        const roomsSet = new Set();

        entries.forEach((e) => {
          if (e.faculty) facultySet.set(e.faculty._id.toString(), e.faculty.fullName);
          if (e.section?.name) sectionSet.add(e.section.name);
          if (e.roomDetails?.roomNumber) roomsSet.add(e.roomDetails.roomNumber);
        });

        return {
          ...subj,
          assignedFaculty: Array.from(facultySet.values()),
          sections: Array.from(sectionSet),
          rooms: Array.from(roomsSet),
          weeklySessionsCount: entries.length
        };
      })
    );

    return successResponse(res, subjectsWithDetails, 'Subjects list retrieved');
  } catch (error) {
    next(error);
  }
};

const getSubjectDetails = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('semester', 'name academicYear')
      .lean();

    if (!subject) {
      return errorResponse(res, 'Subject not found', 404);
    }

    const timetable = await TimetableEntry.find({ subject: subject._id, status: 'ACTIVE' })
      .populate('period')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name')
      .populate('semester', 'name')
      .lean();

    timetable.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    const facultyMap = new Map();
    const sectionsSet = new Set();
    const roomsSet = new Set();

    timetable.forEach((t) => {
      if (t.faculty) facultyMap.set(t.faculty._id.toString(), t.faculty);
      if (t.section?.name) sectionsSet.add(t.section.name);
      if (t.roomDetails?.roomNumber) roomsSet.add(t.roomDetails.roomNumber);
    });

    return successResponse(
      res,
      {
        subject,
        assignedFaculty: Array.from(facultyMap.values()),
        sections: Array.from(sectionsSet),
        rooms: Array.from(roomsSet),
        weeklyPeriods: timetable.length,
        timetable
      },
      'Subject details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * CLASSROOMS LIST & DETAILS
 * GET /api/v1/dean/classrooms
 * GET /api/v1/dean/classrooms/:id
 */
const getClassroomList = async (req, res, next) => {
  try {
    const classrooms = await Classroom.find().sort({ roomNumber: 1 }).lean();

    const classroomsWithStats = await Promise.all(
      classrooms.map(async (c) => {
        const sessions = await TimetableEntry.find({
          roomId: c._id,
          roomType: 'Classroom',
          status: 'ACTIVE'
        })
          .populate('subject', 'name code')
          .populate('faculty', 'fullName')
          .populate('section', 'name')
          .lean();

        return {
          ...c,
          assignedSessionsCount: sessions.length,
          sessions
        };
      })
    );

    return successResponse(res, classroomsWithStats, 'Classrooms list retrieved');
  } catch (error) {
    next(error);
  }
};

const getClassroomDetails = async (req, res, next) => {
  try {
    const classroom = await Classroom.findById(req.params.id).lean();
    if (!classroom) {
      return errorResponse(res, 'Classroom not found', 404);
    }

    const sessions = await TimetableEntry.find({
      roomId: classroom._id,
      roomType: 'Classroom',
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId designation')
      .populate('section', 'name')
      .populate('semester', 'name')
      .lean();

    sessions.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    // Today's classes in this room
    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const todaySchedule = sessions
      .filter((s) => s.day === todayDay)
      .map((s) => {
        const periodStatus = getPeriodStatus(s.period, now);
        return {
          ...s,
          timeFormatted: `${s.period?.startTime} - ${s.period?.endTime}`,
          statusLabel: periodStatus.status
        };
      });

    return successResponse(
      res,
      {
        classroom,
        roomType: 'Classroom',
        assignedSessionsCount: sessions.length,
        todaySchedule,
        weeklySchedule: sessions
      },
      'Classroom details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * LABS LIST & DETAILS
 * GET /api/v1/dean/labs
 * GET /api/v1/dean/labs/:id
 */
const getLabList = async (req, res, next) => {
  try {
    const labs = await Lab.find().sort({ labNumber: 1 }).lean();

    const labsWithStats = await Promise.all(
      labs.map(async (l) => {
        const sessions = await TimetableEntry.find({
          roomId: l._id,
          roomType: 'Lab',
          status: 'ACTIVE'
        })
          .populate('subject', 'name code')
          .populate('faculty', 'fullName')
          .populate('section', 'name')
          .lean();

        const associatedSubjects = new Set();
        sessions.forEach((s) => {
          if (s.subject?.name) associatedSubjects.add(s.subject.name);
        });

        return {
          ...l,
          assignedSessionsCount: sessions.length,
          associatedSubjects: Array.from(associatedSubjects)
        };
      })
    );

    return successResponse(res, labsWithStats, 'Labs list retrieved');
  } catch (error) {
    next(error);
  }
};

const getLabDetails = async (req, res, next) => {
  try {
    const lab = await Lab.findById(req.params.id).lean();
    if (!lab) {
      return errorResponse(res, 'Lab not found', 404);
    }

    const sessions = await TimetableEntry.find({
      roomId: lab._id,
      roomType: 'Lab',
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId designation')
      .populate('section', 'name')
      .populate('semester', 'name')
      .lean();

    sessions.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const todaySchedule = sessions
      .filter((s) => s.day === todayDay)
      .map((s) => {
        const periodStatus = getPeriodStatus(s.period, now);
        return {
          ...s,
          timeFormatted: `${s.period?.startTime} - ${s.period?.endTime}`,
          statusLabel: periodStatus.status
        };
      });

    const subjectsSet = new Set();
    const facultySet = new Set();
    const sectionsSet = new Set();

    sessions.forEach((s) => {
      if (s.subject?.name) subjectsSet.add(s.subject.name);
      if (s.faculty?.fullName) facultySet.add(s.faculty.fullName);
      if (s.section?.name) sectionsSet.add(s.section.name);
    });

    return successResponse(
      res,
      {
        lab,
        roomType: 'Lab',
        associatedSubjects: Array.from(subjectsSet),
        assignedFaculty: Array.from(facultySet),
        sections: Array.from(sectionsSet),
        todaySchedule,
        weeklySchedule: sessions
      },
      'Lab details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * AUDITORIUMS LIST & DETAILS
 * GET /api/v1/dean/auditoriums
 * GET /api/v1/dean/auditoriums/:id
 */
const getAuditoriumList = async (req, res, next) => {
  try {
    const auditoriums = await Auditorium.find().sort({ auditoriumNumber: 1 }).lean();

    const audsWithStats = await Promise.all(
      auditoriums.map(async (a) => {
        const sessions = await TimetableEntry.find({
          roomId: a._id,
          roomType: 'Auditorium',
          status: 'ACTIVE'
        })
          .populate('subject', 'name code')
          .populate('faculty', 'fullName')
          .lean();

        return {
          ...a,
          assignedSessionsCount: sessions.length
        };
      })
    );

    return successResponse(res, audsWithStats, 'Auditoriums list retrieved');
  } catch (error) {
    next(error);
  }
};

const getAuditoriumDetails = async (req, res, next) => {
  try {
    const auditorium = await Auditorium.findById(req.params.id).lean();
    if (!auditorium) {
      return errorResponse(res, 'Auditorium not found', 404);
    }

    const sessions = await TimetableEntry.find({
      roomId: auditorium._id,
      roomType: 'Auditorium',
      status: 'ACTIVE'
    })
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId')
      .populate('section', 'name')
      .lean();

    return successResponse(
      res,
      {
        auditorium,
        roomType: 'Auditorium',
        assignedSessionsCount: sessions.length,
        schedule: sessions
      },
      'Auditorium details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * SEMESTERS LIST & DETAILS
 * GET /api/v1/dean/semesters
 * GET /api/v1/dean/semesters/:id
 */
const getSemesterList = async (req, res, next) => {
  try {
    const semesters = await Semester.find().sort({ name: 1 }).lean();

    const semestersWithStats = await Promise.all(
      semesters.map(async (sem) => {
        const [sectionsCount, subjectsCount, timetableCount] = await Promise.all([
          ClassSection.countDocuments({ semester: sem._id }),
          Subject.countDocuments({ semester: sem._id }),
          TimetableEntry.countDocuments({ semester: sem._id, status: 'ACTIVE' })
        ]);

        return {
          ...sem,
          sectionsCount,
          subjectsCount,
          timetableCount
        };
      })
    );

    return successResponse(res, semestersWithStats, 'Semesters list retrieved');
  } catch (error) {
    next(error);
  }
};

const getSemesterDetails = async (req, res, next) => {
  try {
    const semester = await Semester.findById(req.params.id).lean();
    if (!semester) {
      return errorResponse(res, 'Semester not found', 404);
    }

    const [sections, subjects, timetable] = await Promise.all([
      ClassSection.find({ semester: semester._id }).lean(),
      Subject.find({ semester: semester._id }).lean(),
      TimetableEntry.find({ semester: semester._id, status: 'ACTIVE' })
        .populate('period')
        .populate('subject', 'name code')
        .populate('faculty', 'fullName facultyId')
        .populate('section', 'name')
        .lean()
    ]);

    const facultySet = new Set();
    timetable.forEach((t) => {
      if (t.faculty?.fullName) facultySet.add(t.faculty.fullName);
    });

    return successResponse(
      res,
      {
        semester,
        sections,
        subjects,
        facultyList: Array.from(facultySet),
        timetableSessionsCount: timetable.length,
        timetable
      },
      'Semester details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * SECTIONS LIST & DETAILS
 * GET /api/v1/dean/sections
 * GET /api/v1/dean/sections/:id
 */
const getSectionList = async (req, res, next) => {
  try {
    const sections = await ClassSection.find()
      .populate('semester', 'name academicYear')
      .sort({ name: 1 })
      .lean();

    const sectionsWithStats = await Promise.all(
      sections.map(async (sec) => {
        const sessions = await TimetableEntry.find({ section: sec._id, status: 'ACTIVE' })
          .populate('subject', 'name')
          .populate('faculty', 'fullName')
          .lean();

        const facultySet = new Set();
        const subjectSet = new Set();
        sessions.forEach((s) => {
          if (s.faculty?.fullName) facultySet.add(s.faculty.fullName);
          if (s.subject?.name) subjectSet.add(s.subject.name);
        });

        return {
          ...sec,
          weeklySessionsCount: sessions.length,
          assignedFaculty: Array.from(facultySet),
          subjects: Array.from(subjectSet)
        };
      })
    );

    return successResponse(res, sectionsWithStats, 'Sections list retrieved');
  } catch (error) {
    next(error);
  }
};

const getSectionDetails = async (req, res, next) => {
  try {
    const section = await ClassSection.findById(req.params.id)
      .populate('semester', 'name academicYear')
      .lean();

    if (!section) {
      return errorResponse(res, 'Section not found', 404);
    }

    const timetable = await TimetableEntry.find({ section: section._id, status: 'ACTIVE' })
      .populate('period')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId designation')
      .lean();

    timetable.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    const now = new Date();
    const todayDay = DAYS_OF_WEEK[now.getDay()];
    const todaySchedule = timetable
      .filter((t) => t.day === todayDay)
      .map((t) => {
        const periodStatus = getPeriodStatus(t.period, now);
        return {
          ...t,
          timeFormatted: `${t.period?.startTime} - ${t.period?.endTime}`,
          statusLabel: periodStatus.status
        };
      });

    const facultyMap = new Map();
    const subjectsMap = new Map();
    const roomsSet = new Set();

    timetable.forEach((t) => {
      if (t.faculty) facultyMap.set(t.faculty._id.toString(), t.faculty);
      if (t.subject) subjectsMap.set(t.subject._id.toString(), t.subject);
      if (t.roomDetails?.roomNumber) roomsSet.add(t.roomDetails.roomNumber);
    });

    return successResponse(
      res,
      {
        section,
        assignedFaculty: Array.from(facultyMap.values()),
        subjects: Array.from(subjectsMap.values()),
        classrooms: Array.from(roomsSet),
        todaySchedule,
        weeklySchedule: timetable
      },
      'Section details retrieved'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * MASTER TIMETABLE OVERSIGHT
 * GET /api/v1/dean/timetable
 */
const getMasterTimetable = async (req, res, next) => {
  try {
    const { day, semesterId, sectionId, facultyId, roomType } = req.query;

    const query = { status: 'ACTIVE' };
    if (day && DAYS_OF_WEEK.includes(day)) query.day = day;
    if (semesterId) query.semester = semesterId;
    if (sectionId) query.section = sectionId;
    if (facultyId) query.faculty = facultyId;
    if (roomType) query.roomType = roomType;

    const entries = await TimetableEntry.find(query)
      .populate('period')
      .populate('subject', 'name code credits')
      .populate('faculty', 'fullName facultyId officialEmail')
      .populate('substituteFaculty', 'fullName facultyId officialEmail')
      .populate('originalFaculty', 'fullName facultyId officialEmail')
      .populate('section', 'name')
      .populate('semester', 'name academicYear')
      .lean();

    entries.sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0));

    return successResponse(res, entries, 'Master timetable retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * SUBSTITUTION CENTER
 * GET /api/v1/dean/substitutions
 * GET /api/v1/dean/substitutions/:id
 * PUT /api/v1/dean/substitutions/:id
 */
const getSubstitutions = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date) query.date = date;

    const todayDateStr = new Date().toISOString().split('T')[0];

    const [
      substitutions,
      pendingCount,
      activeCount,
      todayCount,
      completedCount
    ] = await Promise.all([
      Substitution.find(query)
        .populate('period')
        .populate('subject', 'name code')
        .populate('originalFaculty', 'fullName facultyId officialEmail designation')
        .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
        .populate('section', 'name')
        .populate('timetableEntry')
        .sort({ createdAt: -1 })
        .lean(),
      Substitution.countDocuments({ status: 'PENDING' }),
      Substitution.countDocuments({ status: 'CONFIRMED' }),
      Substitution.countDocuments({ date: todayDateStr }),
      Substitution.countDocuments({ status: 'CANCELLED' })
    ]);

    return successResponse(
      res,
      {
        metrics: {
          pendingCount,
          activeCount,
          todayCount,
          completedCount
        },
        substitutions
      },
      'Substitutions retrieved successfully'
    );
  } catch (error) {
    next(error);
  }
};

const getSubstitutionById = async (req, res, next) => {
  try {
    const sub = await Substitution.findById(req.params.id)
      .populate('period')
      .populate('subject', 'name code')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name')
      .populate('timetableEntry')
      .lean();

    if (!sub) {
      return errorResponse(res, 'Substitution not found', 404);
    }

    return successResponse(res, sub, 'Substitution details retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Available substitutes for Dean substitution creation / modification
 * GET /api/v1/dean/available-substitutes
 */
const getAvailableSubstitutes = async (req, res, next) => {
  try {
    const { day, periodId, excludeFacultyId } = req.query;

    if (!day || !periodId) {
      return errorResponse(res, 'Both day and periodId are required to check availability.', 400);
    }

    // 1. Find all timetable entries on this day and period
    const busyEntries = await TimetableEntry.find({
      day,
      period: periodId,
      status: 'ACTIVE'
    }).select('faculty substituteFaculty');

    const busyFacultyIds = new Set();
    busyEntries.forEach((entry) => {
      if (entry.faculty) busyFacultyIds.add(entry.faculty.toString());
      if (entry.substituteFaculty) busyFacultyIds.add(entry.substituteFaculty.toString());
    });

    if (excludeFacultyId) {
      busyFacultyIds.delete(excludeFacultyId.toString());
    }

    // 2. Query all ACTIVE faculty excluding busy faculties
    const availableFaculty = await Faculty.find({
      status: 'ACTIVE',
      _id: { $nin: Array.from(busyFacultyIds) }
    })
      .select('fullName facultyId officialEmail designation department')
      .sort({ fullName: 1 })
      .lean();

    return successResponse(
      res,
      availableFaculty,
      `Found ${availableFaculty.length} eligible substitute faculty members for ${day}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * MODIFY SUBSTITUTION
 * PUT /api/v1/dean/substitutions/:id
 */
const modifySubstitution = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      substituteFacultyId,
      subjectId,
      sectionId,
      roomType,
      roomId,
      roomDetails,
      status = 'CONFIRMED',
      reason
    } = req.body;

    const sub = await Substitution.findById(id);
    if (!sub) {
      return errorResponse(res, 'Substitution record not found', 404);
    }

    if (status && !['CONFIRMED', 'PENDING', 'CANCELLED'].includes(status)) {
      return errorResponse(
        res,
        `Invalid substitution status '${status}'. Allowed statuses are CONFIRMED, PENDING, CANCELLED.`,
        400,
        null,
        {
          code: 'INVALID_STATUS_TRANSITION',
          recommendation: 'Specify a valid substitution status: CONFIRMED, PENDING, or CANCELLED.'
        }
      );
    }

    if (sub.status === 'CANCELLED' && status && status !== 'CANCELLED') {
      return errorResponse(
        res,
        'Cannot reactivate a cancelled substitution. Please create a new substitution request.',
        400,
        null,
        {
          code: 'INVALID_STATUS_TRANSITION',
          recommendation: 'Create a new substitution request instead of modifying a cancelled one.'
        }
      );
    }

    const timetableEntry = await TimetableEntry.findById(sub.timetableEntry);
    if (!timetableEntry) {
      return errorResponse(res, 'Linked timetable entry not found', 404);
    }

    const effectiveSubstituteId = substituteFacultyId || sub.substituteFaculty;
    const effectiveRoomId = roomId || sub.roomId;
    const effectiveSectionId = sectionId || sub.section;
    const periodId = sub.period;
    const day = sub.day;

    // 1. CONFLICT CHECK: Substitute Faculty Availability
    if (status !== 'CANCELLED' && effectiveSubstituteId) {
      const substituteConflict = await TimetableEntry.findOne({
        day,
        period: periodId,
        $or: [
          { faculty: effectiveSubstituteId },
          { substituteFaculty: effectiveSubstituteId }
        ],
        status: 'ACTIVE',
        _id: { $ne: timetableEntry._id }
      }).populate('faculty substituteFaculty');

      if (substituteConflict) {
        const busyFaculty = await Faculty.findById(effectiveSubstituteId);
        const name = busyFaculty?.fullName || 'Selected substitute faculty';
        return errorResponse(
          res,
          `${name} is already assigned to teach another lecture during this period.`,
          409,
          { conflictType: 'FACULTY' },
          {
            code: 'SUBSTITUTION_FACULTY_CONFLICT',
            details: { conflictType: 'FACULTY', facultyName: name },
            recommendation: 'Select an available faculty member who has no scheduled classes during this period.'
          }
        );
      }
    }

    // 2. CONFLICT CHECK: Room Availability (if room is being changed)
    if (status !== 'CANCELLED' && roomId && roomId.toString() !== timetableEntry.roomId?.toString()) {
      const roomConflict = await TimetableEntry.findOne({
        day,
        period: periodId,
        roomId: effectiveRoomId,
        status: 'ACTIVE',
        _id: { $ne: timetableEntry._id }
      });

      if (roomConflict) {
        const roomNum = roomDetails?.roomNumber || sub.roomDetails?.roomNumber || 'This room';
        return errorResponse(
          res,
          `Room ${roomNum} is already occupied by another class during this period.`,
          409,
          { conflictType: 'ROOM' },
          {
            code: 'SUBSTITUTION_ROOM_CONFLICT',
            details: { conflictType: 'ROOM', roomNumber: roomNum },
            recommendation: 'Select an unoccupied room, lab, or auditorium for this time slot.'
          }
        );
      }
    }

    // 3. CONFLICT CHECK: Section Availability (if section is being changed)
    if (status !== 'CANCELLED' && sectionId && sectionId.toString() !== timetableEntry.section?.toString()) {
      const sectionConflict = await TimetableEntry.findOne({
        day,
        period: periodId,
        section: effectiveSectionId,
        status: 'ACTIVE',
        _id: { $ne: timetableEntry._id }
      });

      if (sectionConflict) {
        return errorResponse(
          res,
          `This class section is already scheduled for another subject during this period.`,
          409,
          { conflictType: 'SECTION' },
          {
            code: 'SUBSTITUTION_SECTION_CONFLICT',
            details: { conflictType: 'SECTION' },
            recommendation: 'Choose a time slot where this section has a free period.'
          }
        );
      }
    }

    // 4. Update TimetableEntry
    if (status === 'CANCELLED') {
      timetableEntry.isSubstituted = false;
      timetableEntry.substituteFaculty = null;
      timetableEntry.substitutionStatus = 'CANCELLED';
      timetableEntry.substitutionReason = reason || 'Cancelled by Dean';
    } else {
      timetableEntry.isSubstituted = true;
      timetableEntry.substituteFaculty = effectiveSubstituteId;
      timetableEntry.substitutionStatus = 'SUBSTITUTED';
      timetableEntry.substitutionReason = reason || sub.reason;
      if (subjectId) timetableEntry.subject = subjectId;
      if (sectionId) timetableEntry.section = sectionId;
      if (roomId) timetableEntry.roomId = roomId;
      if (roomType) timetableEntry.roomType = roomType;
      if (roomDetails) timetableEntry.roomDetails = roomDetails;
    }
    await timetableEntry.save();

    // 5. Update Substitution Document
    sub.status = status;
    if (reason) sub.reason = reason;
    if (effectiveSubstituteId) sub.substituteFaculty = effectiveSubstituteId;
    if (subjectId) sub.subject = subjectId;
    if (sectionId) sub.section = sectionId;
    if (roomId) sub.roomId = roomId;
    if (roomType) sub.roomType = roomType;
    if (roomDetails) sub.roomDetails = roomDetails;
    await sub.save();

    // 6. Fetch populated updated docs
    const updatedSub = await Substitution.findById(sub._id)
      .populate('period')
      .populate('subject', 'name code')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('section', 'name')
      .populate('timetableEntry')
      .lean();

    const populatedTimetable = await TimetableEntry.findById(timetableEntry._id)
      .populate('period')
      .populate('semester', 'name academicYear')
      .populate('section', 'name')
      .populate('subject', 'name code')
      .populate('faculty', 'fullName facultyId officialEmail designation')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .lean();

    // 7. Emit Real-time Events for live sync across Dean, Faculty, Student dashboards
    academicEvents.emit(ACADEMIC_EVENTS.SUBSTITUTION_UPDATED, {
      timetableEntry: populatedTimetable,
      substitution: updatedSub,
      updatedBy: req.user.fullName || 'Dean'
    });
    academicEvents.emit(ACADEMIC_EVENTS.TIMETABLE_UPDATED, populatedTimetable);

    return successResponse(
      res,
      {
        substitution: updatedSub,
        timetableEntry: populatedTimetable
      },
      'Substitution updated successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Real-time SSE Stream for Dean Portal
 * GET /api/v1/dean/events
 */
const streamEvents = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  res.write(
    `event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`
  );

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
  getDeanDashboard,
  globalSearch,
  getFacultyList,
  getFacultyDetails,
  getSubjectList,
  getSubjectDetails,
  getClassroomList,
  getClassroomDetails,
  getLabList,
  getLabDetails,
  getAuditoriumList,
  getAuditoriumDetails,
  getSemesterList,
  getSemesterDetails,
  getSectionList,
  getSectionDetails,
  getMasterTimetable,
  getSubstitutions,
  getSubstitutionById,
  getAvailableSubstitutes,
  modifySubstitution,
  streamEvents,
  getQuickSearchSuggestions,
  getClassWiseSearch,
  getRoomWiseSearch,
  getFacultyWiseSearch,
  getFreeRoomsSearch,
  getCurrentStatusSearch
};
