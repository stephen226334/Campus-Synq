const TimetableEntry = require('../models/TimetableEntry');
const Period = require('../models/Period');

/**
 * Validates timetable entries against Faculty, Room, and Section conflicts
 * for a given (Day + Period).
 */
const validateTimetableConflicts = async ({
  day,
  periodId,
  facultyId,
  roomId,
  sectionId,
  excludeEntryId = null
}) => {
  const period = await Period.findById(periodId);
  const periodLabel = period ? `${period.periodNumber} (${period.startTime} - ${period.endTime})` : 'this period';

  // Base query for active entries on the same Day + Period
  const baseQuery = {
    day,
    period: periodId,
    status: 'ACTIVE'
  };

  if (excludeEntryId) {
    baseQuery._id = { $ne: excludeEntryId };
  }

  // 1. Check Faculty Conflict (as primary instructor or assigned substitute)
  const facultyConflict = await TimetableEntry.findOne({
    ...baseQuery,
    $or: [
      { faculty: facultyId },
      { substituteFaculty: facultyId }
    ]
  })
    .populate('faculty', 'fullName')
    .populate('subject', 'name code')
    .populate('section', 'name')
    .lean();

  if (facultyConflict) {
    const facultyName = facultyConflict.faculty?.fullName || 'Faculty member';
    const subName = facultyConflict.subject?.name || 'another course';
    const secName = facultyConflict.section?.name || 'another section';
    const roomNum = facultyConflict.roomDetails?.roomNumber || 'another room';

    return {
      hasConflict: true,
      conflictType: 'FACULTY',
      message: `${facultyName} is already assigned to teach ${subName} (${secName}) in ${roomNum} during ${periodLabel} on ${day}.`
    };
  }

  // 2. Check Room Conflict
  const roomConflict = await TimetableEntry.findOne({
    ...baseQuery,
    roomId
  })
    .populate('faculty', 'fullName')
    .populate('subject', 'name code')
    .populate('section', 'name')
    .lean();

  if (roomConflict) {
    const roomNum = roomConflict.roomDetails?.roomNumber || 'Selected room';
    const facultyName = roomConflict.faculty?.fullName || 'Faculty';
    const subName = roomConflict.subject?.name || 'Class';
    const secName = roomConflict.section?.name || 'Section';

    return {
      hasConflict: true,
      conflictType: 'ROOM',
      message: `Room ${roomNum} is already allocated to ${subName} (${secName}) taught by ${facultyName} during ${periodLabel} on ${day}.`
    };
  }

  // 3. Check Section Conflict
  const sectionConflict = await TimetableEntry.findOne({
    ...baseQuery,
    section: sectionId
  })
    .populate('faculty', 'fullName')
    .populate('subject', 'name code')
    .populate('section', 'name')
    .lean();

  if (sectionConflict) {
    const secName = sectionConflict.section?.name || 'Class section';
    const subName = sectionConflict.subject?.name || 'another subject';
    const facultyName = sectionConflict.faculty?.fullName || 'Faculty';

    return {
      hasConflict: true,
      conflictType: 'SECTION',
      message: `Class section is already scheduled for ${subName} (${secName}) with ${facultyName} during ${periodLabel} on ${day}.`
    };
  }

  return { hasConflict: false };
};

module.exports = {
  validateTimetableConflicts
};
