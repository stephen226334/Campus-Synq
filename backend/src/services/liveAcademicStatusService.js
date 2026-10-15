const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const TimetableEntry = require('../models/TimetableEntry');
const Period = require('../models/Period');
const Substitution = require('../models/Substitution');
const Subject = require('../models/Subject');
const ClassSection = require('../models/ClassSection');
const Semester = require('../models/Semester');

const {
  DAYS_OF_WEEK,
  format12HourTime,
  formatAcademicDate,
  parse12HourTimeToMinutes,
  getPeriodStatus,
  sortPeriodsChronologically,
  sortTimetableEntries
} = require('../utils/timeHelper');

/**
 * calculateLiveAcademicStatus
 *
 * Single source of truth calculation engine for live classes, room occupancy,
 * and faculty status across Campus Synq.
 *
 * @param {Object} options
 * @param {Date} [options.referenceDate=new Date()]
 * @param {string} [options.dayOverride] - Optional day e.g. "Thursday"
 * @param {string} [options.timeOverride] - Optional 12h time e.g. "10:15 AM"
 * @returns {Promise<Object>} Unified status object
 */
const calculateLiveAcademicStatus = async (options = {}) => {
  const referenceDate = options.referenceDate ? new Date(options.referenceDate) : new Date();
  const dayOverride = options.dayOverride && options.dayOverride.trim();
  const timeOverride = options.timeOverride && options.timeOverride.trim();

  const todayDay = dayOverride && DAYS_OF_WEEK.includes(dayOverride)
    ? dayOverride
    : DAYS_OF_WEEK[referenceDate.getDay()];

  const todayDateStr = referenceDate.toISOString().split('T')[0];

  let currentMinutes;
  if (timeOverride) {
    const parsedMinutes = parse12HourTimeToMinutes(timeOverride);
    currentMinutes = parsedMinutes !== null
      ? parsedMinutes
      : referenceDate.getHours() * 60 + referenceDate.getMinutes();
  } else {
    currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  }

  // 1. Fetch all periods sorted chronologically
  const rawPeriods = await Period.find({ status: 'ACTIVE' }).lean();
  const periods = sortPeriodsChronologically(rawPeriods);

  // 2. Identify active, upcoming, and completed periods
  let currentPeriod = null;
  let nextPeriod = null;
  const periodStatuses = periods.map(p => {
    const startM = parse12HourTimeToMinutes(p.startTime);
    const endM = parse12HourTimeToMinutes(p.endTime);
    let status = 'COMPLETED';
    let minutesUntilStart = null;
    let minutesRemaining = null;

    if (startM !== null && endM !== null) {
      if (currentMinutes >= startM && currentMinutes < endM) {
        status = 'CURRENT';
        minutesRemaining = endM - currentMinutes;
        minutesUntilStart = 0;
      } else if (currentMinutes < startM) {
        status = 'UPCOMING';
        minutesUntilStart = startM - currentMinutes;
      } else {
        status = 'COMPLETED';
        minutesRemaining = 0;
      }
    }

    const pStat = {
      period: p,
      status,
      minutesUntilStart,
      minutesRemaining
    };

    if (status === 'CURRENT' && !currentPeriod) {
      currentPeriod = p;
    } else if (status === 'UPCOMING' && !nextPeriod) {
      nextPeriod = p;
    }

    return pStat;
  });

  // 3. Fetch all active venues (Classrooms, Labs, Auditoriums)
  const [classrooms, labs, auditoriums, allFaculty, substitutionsToday, todayEntriesRaw] = await Promise.all([
    Classroom.find({ status: { $ne: 'MAINTENANCE' } }).lean(),
    Lab.find({ status: { $ne: 'MAINTENANCE' } }).lean(),
    Auditorium.find({ status: { $ne: 'MAINTENANCE' } }).lean(),
    Faculty.find().lean(),
    Substitution.find({
      day: todayDay,
      status: { $in: ['CONFIRMED', 'CANCELLED'] }
    })
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation')
      .lean(),
    TimetableEntry.find({ day: todayDay, status: 'ACTIVE' })
      .populate('period')
      .populate('subject', 'name code credits type')
      .populate('faculty', 'fullName facultyId officialEmail designation status')
      .populate('substituteFaculty', 'fullName facultyId officialEmail designation status')
      .populate('originalFaculty', 'fullName facultyId officialEmail designation status')
      .populate('section', 'name capacity')
      .populate('semester', 'name academicYear')
      .lean()
  ]);

  // Index confirmed and cancelled substitutions
  const subMap = new Map();
  const cancelledTimetableIds = new Set();
  substitutionsToday.forEach(sub => {
    if (sub.status === 'CANCELLED') {
      if (sub.timetableEntry) cancelledTimetableIds.add(sub.timetableEntry.toString());
    } else if (sub.status === 'CONFIRMED') {
      if (sub.timetableEntry) subMap.set(sub.timetableEntry.toString(), sub);
    }
  });

  // 4. Process today's timetable entries and identify live entries
  const sortedTodayEntries = sortTimetableEntries(todayEntriesRaw);
  const liveClasses = [];
  const conflicts = [];

  // Groupings for conflict detection
  const roomLiveMap = new Map(); // roomId -> array of live classes
  const facultyLiveMap = new Map(); // facultyId -> array of live classes

  const processedTodaySchedule = sortedTodayEntries.map(entry => {
    if (cancelledTimetableIds.has(entry._id.toString())) {
      return {
        _id: entry._id,
        day: entry.day,
        period: entry.period?.periodNumber || 'P1',
        time: `${entry.period?.startTime || ''} - ${entry.period?.endTime || ''}`,
        subject: entry.subject?.name || 'Class',
        subjectCode: entry.subject?.code || '',
        faculty: 'Cancelled',
        status: 'CANCELLED',
        isCancelled: true
      };
    }

    const startM = entry.period ? parse12HourTimeToMinutes(entry.period.startTime) : null;
    const endM = entry.period ? parse12HourTimeToMinutes(entry.period.endTime) : null;
    const isLive = startM !== null && endM !== null && currentMinutes >= startM && currentMinutes < endM;

    // Apply substitution if present
    const activeSub = subMap.get(entry._id.toString());
    const isSubstituted = !!(activeSub || entry.isSubstituted);
    const effectiveFaculty = activeSub
      ? activeSub.substituteFaculty
      : (entry.isSubstituted && entry.substituteFaculty ? entry.substituteFaculty : entry.faculty);
    const originalFaculty = activeSub
      ? activeSub.originalFaculty
      : (entry.isSubstituted ? entry.originalFaculty : null);

    const roomNumber = entry.roomDetails?.roomNumber || 'Unassigned';
    const roomIdStr = entry.roomId ? entry.roomId.toString() : null;
    const facultyDocId = effectiveFaculty?._id ? effectiveFaculty._id.toString() : null;

    const classItem = {
      _id: entry._id,
      day: entry.day,
      period: entry.period?.periodNumber || 'P1',
      periodOrder: entry.period?.order || 1,
      startTime: entry.period?.startTime || '',
      endTime: entry.period?.endTime || '',
      time: `${entry.period?.startTime || ''} - ${entry.period?.endTime || ''}`,
      subject: entry.subject?.name || 'Unassigned Subject',
      subjectCode: entry.subject?.code || '',
      subjectType: entry.subject?.type || 'Theory',
      credits: entry.subject?.credits || 0,
      faculty: effectiveFaculty?.fullName || 'Faculty Not Assigned',
      facultyId: effectiveFaculty?.facultyId || '',
      facultyDocId,
      facultyEmail: effectiveFaculty?.officialEmail || '',
      facultyDesignation: effectiveFaculty?.designation || '',
      isSubstituted,
      substituteFaculty: isSubstituted ? effectiveFaculty?.fullName : null,
      originalFaculty: originalFaculty?.fullName || null,
      section: entry.section?.name || 'Section',
      sectionId: entry.section?._id,
      semester: entry.semester?.name || '',
      room: roomNumber,
      roomId: entry.roomId,
      roomType: entry.roomType || 'Classroom',
      venueName: entry.roomDetails?.name || roomNumber,
      status: isLive ? 'LIVE' : (startM && currentMinutes < startM ? 'UPCOMING' : 'COMPLETED'),
      minutesRemaining: isLive && endM !== null ? endM - currentMinutes : 0,
      hasConflict: false,
      conflictType: null,
      conflictDescription: null
    };

    if (isLive) {
      liveClasses.push(classItem);

      // Track room allocations
      const roomKey = roomIdStr || roomNumber.toUpperCase();
      if (!roomLiveMap.has(roomKey)) {
        roomLiveMap.set(roomKey, []);
      }
      roomLiveMap.get(roomKey).push(classItem);

      // Track faculty allocations (if faculty assigned)
      if (facultyDocId) {
        if (!facultyLiveMap.has(facultyDocId)) {
          facultyLiveMap.set(facultyDocId, []);
        }
        facultyLiveMap.get(facultyDocId).push(classItem);
      }
    }

    return classItem;
  });

  // 5. Detect and surface scheduling conflicts among live classes
  roomLiveMap.forEach((classes, roomKey) => {
    if (classes.length > 1) {
      const roomName = classes[0].room;
      conflicts.push({
        type: 'ROOM_CONFLICT',
        room: roomName,
        message: `Multiple classes running simultaneously in venue ${roomName} (${classes.length} classes)`,
        classes: classes.map(c => ({ id: c._id, subject: c.subject, section: c.section, faculty: c.faculty }))
      });
      classes.forEach(c => {
        c.hasConflict = true;
        c.conflictType = 'ROOM_CONFLICT';
        c.conflictDescription = `Venue ${roomName} is concurrently occupied by ${classes.length} classes.`;
      });
    }
  });

  facultyLiveMap.forEach((classes, facId) => {
    if (classes.length > 1) {
      const facName = classes[0].faculty;
      conflicts.push({
        type: 'FACULTY_CONFLICT',
        faculty: facName,
        message: `Faculty member ${facName} is assigned to ${classes.length} simultaneous classes`,
        classes: classes.map(c => ({ id: c._id, subject: c.subject, section: c.section, room: c.room }))
      });
      classes.forEach(c => {
        c.hasConflict = true;
        c.conflictType = c.conflictType ? `${c.conflictType} & FACULTY_CONFLICT` : 'FACULTY_CONFLICT';
        c.conflictDescription = c.conflictDescription
          ? `${c.conflictDescription} Faculty ${facName} is also teaching concurrent classes.`
          : `Faculty ${facName} is assigned to multiple concurrent classes.`;
      });
    }
  });

  // 6. Map All Venues (Occupied vs Available)
  // Build unified list of all valid venues
  const allVenues = [
    ...classrooms.map(c => ({
      venueId: c._id,
      identifier: c.roomNumber,
      name: c.name || `Classroom ${c.roomNumber}`,
      venueType: 'Classroom',
      capacity: c.capacity || 60,
      floor: c.floor || ''
    })),
    ...labs.map(l => ({
      venueId: l._id,
      identifier: l.labNumber,
      name: l.labName || `Lab ${l.labNumber}`,
      venueType: 'Lab',
      capacity: l.capacity || 45,
      floor: l.floor || ''
    })),
    ...auditoriums.map(a => ({
      venueId: a._id,
      identifier: a.auditoriumNumber,
      name: a.auditoriumName || `Auditorium ${a.auditoriumNumber}`,
      venueType: 'Auditorium',
      capacity: a.capacity || 250,
      floor: a.floor || ''
    }))
  ];

  const occupiedVenues = [];
  const availableVenues = [];

  allVenues.forEach(venue => {
    const venueIdStr = venue.venueId.toString();
    const venueIdentUpper = venue.identifier ? venue.identifier.toUpperCase() : '';

    // Check if any live class is running in this venue
    const matchingLiveClasses = liveClasses.filter(c => {
      if (c.roomId && c.roomId.toString() === venueIdStr) return true;
      if (c.room && c.room.toUpperCase() === venueIdentUpper) return true;
      return false;
    });

    if (matchingLiveClasses.length > 0) {
      const primaryClass = matchingLiveClasses[0];
      occupiedVenues.push({
        ...venue,
        status: 'OCCUPIED',
        isOccupied: true,
        runningClass: {
          _id: primaryClass._id,
          subject: primaryClass.subject,
          subjectCode: primaryClass.subjectCode,
          section: primaryClass.section,
          faculty: primaryClass.faculty,
          facultyId: primaryClass.facultyId,
          period: primaryClass.period,
          time: primaryClass.time,
          startTime: primaryClass.startTime,
          endTime: primaryClass.endTime
        },
        hasConflict: matchingLiveClasses.length > 1,
        conflictingClasses: matchingLiveClasses.length > 1
          ? matchingLiveClasses.map(c => ({
              id: c._id,
              subject: c.subject,
              section: c.section,
              faculty: c.faculty
            }))
          : []
      });
    } else {
      availableVenues.push({
        ...venue,
        status: 'AVAILABLE',
        isOccupied: false
      });
    }
  });

  // 7. Map Faculty Status (Distinguishing 4 Required Categories)
  // Categories:
  // 1. TEACHING_NOW: Currently assigned to a live class running right now
  // 2. AVAILABLE_NOW: Has scheduled duties today, but currently free / no class running now
  // 3. NOT_SCHEDULED_TODAY: Has zero scheduled classes for the entire day today
  // 4. STATUS_UNKNOWN: Missing or invalid profile data, or status !== 'ACTIVE'
  const teachingFaculty = [];
  const availableFaculty = []; // All faculty with categorized status

  allFaculty.forEach(faculty => {
    const facIdStr = faculty._id.toString();

    // 1. Check if profile data is missing or invalid
    const isProfileInvalid = !faculty.fullName || !faculty.facultyId || faculty.status !== 'ACTIVE';
    if (isProfileInvalid) {
      const facObj = {
        facultyId: faculty._id,
        employeeId: faculty.facultyId || 'N/A',
        fullName: faculty.fullName || 'Unknown Faculty',
        designation: faculty.designation || 'Faculty',
        department: faculty.department || 'Computer Science',
        officialEmail: faculty.officialEmail || '',
        category: 'STATUS_UNKNOWN',
        status: 'STATUS_UNKNOWN',
        statusLabel: 'Status Unknown',
        statusBadgeClass: 'unknown',
        reason: faculty.status === 'INACTIVE'
          ? 'Account inactive'
          : faculty.status === 'ON_LEAVE'
            ? 'On official leave'
            : 'Incomplete or unverified faculty profile data'
      };
      availableFaculty.push(facObj);
      return;
    }

    // 2. Check if currently teaching in any live class
    const liveTeachingClasses = liveClasses.filter(c => c.facultyDocId === facIdStr);
    if (liveTeachingClasses.length > 0) {
      const primaryClass = liveTeachingClasses[0];
      const facObj = {
        facultyId: faculty._id,
        employeeId: faculty.facultyId,
        fullName: faculty.fullName,
        designation: faculty.designation || 'Faculty',
        department: faculty.department || 'Computer Science',
        officialEmail: faculty.officialEmail || '',
        category: 'TEACHING_NOW',
        status: 'TEACHING_NOW',
        statusLabel: 'Teaching Now',
        statusBadgeClass: 'teaching',
        currentClass: {
          _id: primaryClass._id,
          subject: primaryClass.subject,
          subjectCode: primaryClass.subjectCode,
          section: primaryClass.section,
          room: primaryClass.room,
          roomType: primaryClass.roomType,
          period: primaryClass.period,
          time: primaryClass.time,
          startTime: primaryClass.startTime,
          endTime: primaryClass.endTime
        },
        hasConflict: liveTeachingClasses.length > 1,
        conflictingClasses: liveTeachingClasses.length > 1
          ? liveTeachingClasses.map(c => ({
              id: c._id,
              subject: c.subject,
              section: c.section,
              room: c.room
            }))
          : []
      };
      teachingFaculty.push(facObj);
      availableFaculty.push(facObj);
      return;
    }

    // 3. Not teaching right now -> check if they have classes scheduled today
    const todayFacultyClasses = processedTodaySchedule.filter(entry => {
      if (entry.isCancelled) return false;
      return entry.facultyDocId === facIdStr;
    });

    if (todayFacultyClasses.length > 0) {
      // Find next upcoming class today if any
      const upcomingClass = todayFacultyClasses.find(c => c.status === 'UPCOMING');
      const facObj = {
        facultyId: faculty._id,
        employeeId: faculty.facultyId,
        fullName: faculty.fullName,
        designation: faculty.designation || 'Faculty',
        department: faculty.department || 'Computer Science',
        officialEmail: faculty.officialEmail || '',
        category: 'AVAILABLE_NOW',
        status: 'AVAILABLE_NOW',
        statusLabel: 'Available Now',
        statusBadgeClass: 'available',
        todayClassesCount: todayFacultyClasses.length,
        nextClass: upcomingClass
          ? {
              subject: upcomingClass.subject,
              subjectCode: upcomingClass.subjectCode,
              section: upcomingClass.section,
              room: upcomingClass.room,
              period: upcomingClass.period,
              time: upcomingClass.time
            }
          : null,
        statusNote: upcomingClass
          ? `Next class: ${upcomingClass.subject} at ${upcomingClass.startTime} (${upcomingClass.room})`
          : 'Free for remaining academic periods today'
      };
      availableFaculty.push(facObj);
    } else {
      // 4. Zero classes scheduled today
      const facObj = {
        facultyId: faculty._id,
        employeeId: faculty.facultyId,
        fullName: faculty.fullName,
        designation: faculty.designation || 'Faculty',
        department: faculty.department || 'Computer Science',
        officialEmail: faculty.officialEmail || '',
        category: 'NOT_SCHEDULED_TODAY',
        status: 'NOT_SCHEDULED_TODAY',
        statusLabel: 'Not Scheduled Today',
        statusBadgeClass: 'not-scheduled',
        todayClassesCount: 0,
        reason: 'No teaching assignments scheduled for this day'
      };
      availableFaculty.push(facObj);
    }
  });

  // 8. Calculate unified, deduplicated overview stats
  const totalRooms = allVenues.length;
  const occupiedRoomsCount = occupiedVenues.length;
  const freeRoomsCount = availableVenues.length;
  const totalFacultyCount = allFaculty.length;
  const facultyTeachingCount = teachingFaculty.length;
  const facultyAvailableNowCount = availableFaculty.filter(f => f.category === 'AVAILABLE_NOW').length;
  const facultyNotScheduledCount = availableFaculty.filter(f => f.category === 'NOT_SCHEDULED_TODAY').length;
  const facultyUnknownCount = availableFaculty.filter(f => f.category === 'STATUS_UNKNOWN').length;

  const liveStats = {
    totalClasses: processedTodaySchedule.filter(c => !c.isCancelled).length,
    classesRunningNow: liveClasses.length,
    occupiedRooms: occupiedRoomsCount,
    freeRooms: freeRoomsCount,
    totalRooms,
    facultyInClass: facultyTeachingCount,
    freeFaculty: facultyAvailableNowCount, // strictly available now
    facultyNotScheduledToday: facultyNotScheduledCount,
    facultyStatusUnknown: facultyUnknownCount,
    totalFaculty: totalFacultyCount,
    hasConflicts: conflicts.length > 0,
    conflictsCount: conflicts.length
  };

  return {
    currentTime12: format12HourTime(referenceDate),
    currentMinutes,
    todayDay,
    todayDateStr,
    academicDate: formatAcademicDate(referenceDate),
    currentPeriod: currentPeriod ? currentPeriod.periodNumber : null,
    currentPeriodTiming: currentPeriod ? `${currentPeriod.startTime} - ${currentPeriod.endTime}` : 'Break / Off Hours',
    nextPeriod: nextPeriod ? nextPeriod.periodNumber : null,
    nextPeriodTiming: nextPeriod ? `${nextPeriod.startTime} - ${nextPeriod.endTime}` : null,
    liveStats,
    liveClasses,
    occupiedVenues,
    availableVenues,
    teachingFaculty,
    availableFaculty,
    conflicts,
    todaySchedule: processedTodaySchedule
  };
};

module.exports = {
  calculateLiveAcademicStatus
};
