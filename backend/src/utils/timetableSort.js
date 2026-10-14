/**
 * CAMPUS SYNQ — Chronological Timetable & Period Sorting Utility
 *
 * Implements strict chronological sorting for timetable entries and periods
 * based on configured 12-hour/24-hour start times.
 */

const ACADEMIC_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DAY_INDEX = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6
};

/**
 * Parse time string to minutes since midnight (0 - 1439).
 * Supports 12-hour format ("9:00 AM", "12:00 PM", "1:40 PM", "01:40 pm")
 * and 24-hour format ("09:00", "13:40").
 * Returns Number.MAX_SAFE_INTEGER if missing or invalid, so invalid/untimed
 * records sort safely after all valid timed records.
 *
 * @param {string} timeStr - Time string to parse
 * @returns {number} Minutes since midnight, or Number.MAX_SAFE_INTEGER if invalid
 */
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return Number.MAX_SAFE_INTEGER;

  const trimmed = timeStr.trim();
  if (!trimmed) return Number.MAX_SAFE_INTEGER;

  // 12-hour format: e.g. "9:00 AM", "12:50 PM", "01:40 pm", "10:00:00 AM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3].toUpperCase();

    if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes >= 60 || hours < 1 || hours > 12) {
      return Number.MAX_SAFE_INTEGER;
    }

    if (meridian === 'AM') {
      if (hours === 12) hours = 0;
    } else if (meridian === 'PM') {
      if (hours !== 12) hours += 12;
    }

    return hours * 60 + minutes;
  }

  // Fallback 24-hour format: e.g. "09:00", "13:40", "13:40:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours >= 24 || minutes < 0 || minutes >= 60) {
      return Number.MAX_SAFE_INTEGER;
    }

    return hours * 60 + minutes;
  }

  return Number.MAX_SAFE_INTEGER;
};

/**
 * Extract integer number from period identifier (e.g. "P1" -> 1, "P10" -> 10, "SLOT-4" -> 4)
 *
 * @param {string} periodNumber
 * @returns {number} Extracted integer or Number.MAX_SAFE_INTEGER
 */
const parsePeriodNumber = (periodNumber) => {
  if (!periodNumber) return Number.MAX_SAFE_INTEGER;
  const match = String(periodNumber).match(/\d+/);
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER;
};

/**
 * Sort periods chronologically by configured start time as primary key.
 * Stable secondary sorting uses endTime, order, periodNumber, and _id.
 *
 * @param {Array} periods - Array of Period documents
 * @returns {Array} New sorted array of periods
 */
const sortPeriodsChronologically = (periods) => {
  if (!Array.isArray(periods)) return [];

  return [...periods].sort((a, b) => {
    // 1. Primary: Start time in minutes
    const startA = parseTimeToMinutes(a?.startTime);
    const startB = parseTimeToMinutes(b?.startTime);
    if (startA !== startB) return startA - startB;

    // 2. Secondary: End time in minutes
    const endA = parseTimeToMinutes(a?.endTime);
    const endB = parseTimeToMinutes(b?.endTime);
    if (endA !== endB) return endA - endB;

    // 3. Tertiary: Numeric sequence / order
    const orderA = typeof a?.order === 'number' && !isNaN(a.order)
      ? a.order
      : parsePeriodNumber(a?.periodNumber);
    const orderB = typeof b?.order === 'number' && !isNaN(b.order)
      ? b.order
      : parsePeriodNumber(b?.periodNumber);
    if (orderA !== orderB) return orderA - orderB;

    // 4. Stable tie-breaker: textual label or ID
    const labelA = String(a?.periodNumber || a?.name || a?._id || '');
    const labelB = String(b?.periodNumber || b?.name || b?._id || '');
    return labelA.localeCompare(labelB);
  });
};

/**
 * Sort timetable entries chronologically:
 * 1. Day of the week (Monday -> Sunday)
 * 2. Period configured start time (AM/PM parsed to minutes)
 * 3. Period configured end time
 * 4. Period order / sequence
 * 5. Stable tie-breaker (_id)
 *
 * Unassigned / missing periods or invalid times safely sort at the end of each day.
 *
 * @param {Array} entries - Array of TimetableEntry documents
 * @returns {Array} New sorted array of timetable entries
 */
const sortTimetableEntries = (entries) => {
  if (!Array.isArray(entries)) return [];

  return [...entries].sort((a, b) => {
    // 1. Academic Day of Week
    const dayA = DAY_INDEX[a?.day] !== undefined ? DAY_INDEX[a.day] : 999;
    const dayB = DAY_INDEX[b?.day] !== undefined ? DAY_INDEX[b.day] : 999;
    if (dayA !== dayB) return dayA - dayB;

    // 2. Configured Period Start Time (minutes from midnight)
    const periodA = a?.period;
    const periodB = b?.period;

    const startA = parseTimeToMinutes(periodA?.startTime);
    const startB = parseTimeToMinutes(periodB?.startTime);
    if (startA !== startB) return startA - startB;

    // 3. Period End Time
    const endA = parseTimeToMinutes(periodA?.endTime);
    const endB = parseTimeToMinutes(periodB?.endTime);
    if (endA !== endB) return endA - endB;

    // 4. Sequence order / period number
    const orderA = typeof periodA?.order === 'number' && !isNaN(periodA.order)
      ? periodA.order
      : parsePeriodNumber(periodA?.periodNumber);
    const orderB = typeof periodB?.order === 'number' && !isNaN(periodB.order)
      ? periodB.order
      : parsePeriodNumber(periodB?.periodNumber);
    if (orderA !== orderB) return orderA - orderB;

    // 5. Stable tie-breaker
    const idA = String(a?._id || '');
    const idB = String(b?._id || '');
    return idA.localeCompare(idB);
  });
};

module.exports = {
  ACADEMIC_DAYS,
  DAY_INDEX,
  parseTimeToMinutes,
  parsePeriodNumber,
  sortPeriodsChronologically,
  sortTimetableEntries
};
