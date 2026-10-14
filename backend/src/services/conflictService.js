const TimetableEntry = require('../models/TimetableEntry');
const Period = require('../models/Period');

/**
 * Validates timetable entries against Faculty, Room, Section, and Duplicate conflicts
 * for a given (Day + Period).
 *
 * Distinguishes between:
 * 1. DUPLICATE_SESSION: Same section + same subject in the same period slot (Strictly prohibited).
 * 2. SECTION: Same section in the same period slot with a different class (Strictly prohibited).
 * 3. ROOM: Same room occupied by a DIFFERENT faculty member / unrelated class (Strictly prohibited).
 * 4. COMBINED_CLASS: Same faculty member teaching multiple sections together (Shared room or joint course) (Allowed with confirmation).
 * 5. FACULTY: Same faculty member assigned to a different room / unrelated session (Allowed with confirmation).
 */
const validateTimetableConflicts = async ({
  day,
  periodId,
  facultyId,
  roomId,
  sectionId,
  subjectId = null,
  excludeEntryId = null,
  overrideConflict = false,
  allowCombinedClass = false
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

  // Fetch all active entries for this day and period slot
  const slotEntries = await TimetableEntry.find(baseQuery)
    .populate('faculty', 'fullName facultyId officialEmail designation')
    .populate('substituteFaculty', 'fullName facultyId')
    .populate('subject', 'name code')
    .populate('section', 'name')
    .lean();

  const toId = (val) => {
    if (!val) return '';
    return (val._id || val).toString();
  };

  // 1. Check Faculty Conflict & Combined Class
  if (facultyId) {
    const facultyConflict = slotEntries.find(
      (e) => toId(e.faculty) === facultyId.toString() ||
             toId(e.substituteFaculty) === facultyId.toString()
    );

    if (facultyConflict) {
      const facultyName = facultyConflict.faculty?.fullName || 'Faculty member';
      const subName = facultyConflict.subject?.name || 'another course';
      const secName = facultyConflict.section?.name || 'another section';
      const roomNum = facultyConflict.roomDetails?.roomNumber || 'another room';

      const isSameSection = sectionId && toId(facultyConflict.section) === sectionId.toString();
      const isSameSubject = subjectId && toId(facultyConflict.subject) === subjectId.toString();
      const isSameRoom = roomId && toId(facultyConflict.roomId) === roomId.toString();

      // If the incoming request is for the same section:
      // It cannot be a combined class (a section cannot be combined with itself)
      // If admin attempts to override a duplicate session, strictly reject
      if (isSameSection && (overrideConflict || allowCombinedClass)) {
        return {
          hasConflict: true,
          conflictType: isSameSubject ? 'DUPLICATE_SESSION' : 'SECTION',
          canOverride: false,
          message: isSameSubject
            ? `Duplicate session: ${secName} is already scheduled for ${subName} during ${periodLabel} on ${day}. Accidental duplicate sessions cannot be scheduled.`
            : `Class section is already scheduled for ${subName} (${secName}) with ${facultyName} during ${periodLabel} on ${day}.`,
          recommendation: isSameSubject
            ? `This exact class session is already on the timetable. Review existing timetable entries before adding.`
            : `Cohort section cannot attend two simultaneous lectures. Select a free period slot.`,
          details: {
            conflictType: isSameSubject ? 'DUPLICATE_SESSION' : 'SECTION',
            canOverride: false,
            existingEntry: {
              id: facultyConflict._id,
              facultyName,
              facultyId: facultyConflict.faculty?.facultyId || '',
              subjectName: subName,
              subjectCode: facultyConflict.subject?.code || '',
              sectionName: secName,
              roomNumber: roomNum,
              day,
              periodLabel
            }
          }
        };
      }

      // Different section -> Potential intentional combined class or faculty overlap
      const isCombinedClass = !isSameSection && Boolean(isSameRoom || isSameSubject);
      const conflictType = isCombinedClass ? 'COMBINED_CLASS' : 'FACULTY';
      const canOverride = !isSameSection;

      // If override or combined class confirmation is explicitly provided
      if (canOverride && (overrideConflict || allowCombinedClass)) {
        return {
          hasConflict: false,
          isCombinedClass: true,
          combinedWithEntryId: facultyConflict._id
        };
      }

      return {
        hasConflict: true,
        conflictType,
        canOverride,
        message: `${facultyName} is already assigned to teach ${subName} (${secName}) in ${roomNum} during ${periodLabel} on ${day}.`,
        recommendation: isCombinedClass
          ? `Confirm to schedule this session as an intentional combined class with ${secName}.`
          : `Choose an alternative faculty instructor or schedule this lecture during a different period slot.`,
        details: {
          conflictType,
          canOverride,
          existingEntry: {
            id: facultyConflict._id,
            facultyName,
            facultyId: facultyConflict.faculty?.facultyId || '',
            subjectName: subName,
            subjectCode: facultyConflict.subject?.code || '',
            sectionName: secName,
            roomNumber: roomNum,
            day,
            periodLabel
          }
        }
      };
    }
  }

  // 2. Check Room Conflict with a Different Faculty (Strictly prohibited - Cannot override)
  if (roomId) {
    const roomConflictWithDifferentFaculty = slotEntries.find((e) => {
      if (toId(e.roomId) !== roomId.toString()) return false;
      const isSameFaculty =
        (facultyId && toId(e.faculty) === facultyId.toString()) ||
        (facultyId && toId(e.substituteFaculty) === facultyId.toString());
      return !isSameFaculty;
    });

    if (roomConflictWithDifferentFaculty) {
      const roomNum = roomConflictWithDifferentFaculty.roomDetails?.roomNumber || 'Selected room';
      const facultyName = roomConflictWithDifferentFaculty.faculty?.fullName || 'Faculty';
      const subName = roomConflictWithDifferentFaculty.subject?.name || 'Class';
      const secName = roomConflictWithDifferentFaculty.section?.name || 'Section';

      return {
        hasConflict: true,
        conflictType: 'ROOM',
        canOverride: false,
        message: `Room ${roomNum} is already allocated to ${subName} (${secName}) taught by ${facultyName} during ${periodLabel} on ${day}.`,
        recommendation: `Select another available classroom or laboratory, or reschedule this session. Different classes cannot occupy the same room.`,
        details: {
          conflictType: 'ROOM',
          canOverride: false,
          existingEntry: {
            id: roomConflictWithDifferentFaculty._id,
            facultyName,
            subjectName: subName,
            subjectCode: roomConflictWithDifferentFaculty.subject?.code || '',
            sectionName: secName,
            roomNumber: roomNum,
            day,
            periodLabel
          }
        }
      };
    }
  }

  // 3. Check Section Conflict (Same section scheduled with another faculty)
  if (sectionId) {
    const sectionEntry = slotEntries.find(
      (e) => toId(e.section) === sectionId.toString()
    );

    if (sectionEntry) {
      const secName = sectionEntry.section?.name || 'Class section';
      const subName = sectionEntry.subject?.name || 'another subject';
      const facultyName = sectionEntry.faculty?.fullName || 'Faculty';
      const roomNum = sectionEntry.roomDetails?.roomNumber || 'Room';
      const isSameSubject = subjectId && toId(sectionEntry.subject) === subjectId.toString();

      const message = (overrideConflict || allowCombinedClass) && isSameSubject
        ? `Duplicate session: ${secName} is already scheduled for ${subName} during ${periodLabel} on ${day}. Accidental duplicate sessions cannot be scheduled.`
        : `Class section is already scheduled for ${subName} (${secName}) with ${facultyName} during ${periodLabel} on ${day}.`;

      return {
        hasConflict: true,
        conflictType: isSameSubject ? 'DUPLICATE_SESSION' : 'SECTION',
        canOverride: false,
        message,
        recommendation: isSameSubject
          ? `This exact class session is already on the timetable. Review existing timetable entries before adding.`
          : `Cohort section cannot attend two simultaneous lectures. Select a free period slot.`,
        details: {
          conflictType: isSameSubject ? 'DUPLICATE_SESSION' : 'SECTION',
          canOverride: false,
          existingEntry: {
            id: sectionEntry._id,
            facultyName,
            subjectName: subName,
            subjectCode: sectionEntry.subject?.code || '',
            sectionName: secName,
            roomNumber: roomNum,
            day,
            periodLabel
          }
        }
      };
    }
  }

  return { hasConflict: false };
};

module.exports = {
  validateTimetableConflicts
};
