/**
 * Utility functions for 12-hour academic time calculations and period state detection
 */

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Convert 12-hour time string like "9:00 AM" or "10:50 PM" to minutes from midnight (0-1439)
 */
const parse12HourTimeToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridian = match[3].toUpperCase();

  if (meridian === 'AM') {
    if (hours === 12) hours = 0;
  } else if (meridian === 'PM') {
    if (hours !== 12) hours += 12;
  }

  return hours * 60 + minutes;
};

/**
 * Format Date to 12-hour format strictly, e.g. "10:42 AM" (never 24h format)
 */
const format12HourTime = (date = new Date()) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  return `${hours}:${formattedMinutes} ${ampm}`;
};

/**
 * Academic Timezone Configuration: Asia/Kolkata
 */
const ACADEMIC_TIMEZONE = 'Asia/Kolkata';

/**
 * Get current academic date & time components in Asia/Kolkata timezone
 */
const getKolkataAcademicDateTime = (dateInput = new Date()) => {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ACADEMIC_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = Object.fromEntries(formatter.formatToParts(date).map(p => [p.type, p.value]));
  const weekday = parts.weekday;
  const hour = parseInt(parts.hour, 10);
  const minute = parseInt(parts.minute, 10);
  const currentMinutes = hour * 60 + minute;
  const dayOfMonth = parts.day;
  const monthName = parts.month;
  const year = parts.year;

  const monthFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ACADEMIC_TIMEZONE,
    month: '2-digit'
  });
  const month2Digit = monthFormatter.format(date);
  const dateStr = `${year}-${month2Digit}-${dayOfMonth}`;

  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const m12 = minute < 10 ? `0${minute}` : minute;
  const time12h = `${h12}:${m12} ${ampm}`;

  return {
    weekday,
    dayName: weekday,
    dateStr,
    currentMinutes,
    time12h,
    formattedDate: `${dayOfMonth} ${monthName} ${year}`,
    fullDisplay: `${weekday}, ${dayOfMonth} ${monthName} ${year}`
  };
};

/**
 * Match weekday with case insensitivity and common abbreviations (e.g. "tuesday", "TUE", "Friday")
 */
const normalizeWeekday = (dayStr) => {
  if (!dayStr || typeof dayStr !== 'string') return null;
  const cleaned = dayStr.trim().toLowerCase();
  return DAYS_OF_WEEK.find(d => d.toLowerCase() === cleaned || d.toLowerCase().startsWith(cleaned)) || null;
};

/**
 * Format Date to readable academic format in Asia/Kolkata timezone
 */
const formatAcademicDate = (date = new Date()) => {
  const kolkata = getKolkataAcademicDateTime(date);
  return {
    dayName: kolkata.dayName,
    formattedDate: kolkata.formattedDate,
    fullDisplay: kolkata.fullDisplay
  };
};

/**
 * Determine dynamic period status (CURRENT, UPCOMING, COMPLETED)
 * @param {Object} period - { startTime, endTime, periodNumber }
 * @param {Date} referenceDate - current local/server date
 */
const getPeriodStatus = (period, referenceDate = new Date()) => {
  if (!period || !period.startTime || !period.endTime) {
    return { status: 'UPCOMING', minutesUntilStart: null, minutesRemaining: null, isApproaching: false };
  }

  const startMinutes = parse12HourTimeToMinutes(period.startTime);
  const endMinutes = parse12HourTimeToMinutes(period.endTime);

  if (startMinutes === null || endMinutes === null) {
    return { status: 'UPCOMING', minutesUntilStart: null, minutesRemaining: null, isApproaching: false };
  }

  const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) {
    return {
      status: 'CURRENT',
      minutesUntilStart: 0,
      minutesRemaining: endMinutes - currentMinutes,
      isApproaching: false
    };
  } else if (currentMinutes < startMinutes) {
    const diff = startMinutes - currentMinutes;
    return {
      status: 'UPCOMING',
      minutesUntilStart: diff,
      minutesRemaining: endMinutes - currentMinutes,
      isApproaching: diff <= 15
    };
  } else {
    return {
      status: 'COMPLETED',
      minutesUntilStart: 0,
      minutesRemaining: 0,
      isApproaching: false
    };
  }
};

/**
 * Matches a user time string (e.g. "10:00 AM", "10:35 AM", "10:00 AM - 11:00 AM") against periods
 */
const findPeriodForTime = (timeStr, periods) => {
  if (!timeStr || !periods || !periods.length) return null;
  let queryTime = timeStr.trim();
  if (queryTime.includes('-')) {
    queryTime = queryTime.split('-')[0].trim();
  }
  const queryMinutes = parse12HourTimeToMinutes(queryTime);
  if (queryMinutes === null) return null;

  for (const period of periods) {
    const start = parse12HourTimeToMinutes(period.startTime);
    const end = parse12HourTimeToMinutes(period.endTime);
    if (start !== null && end !== null) {
      if (queryMinutes >= start && queryMinutes < end) {
        return period;
      }
    }
  }

  // Fallback: closest start time match within 45 mins
  let closestPeriod = null;
  let minDiff = Infinity;
  for (const period of periods) {
    const start = parse12HourTimeToMinutes(period.startTime);
    if (start !== null) {
      const diff = Math.abs(queryMinutes - start);
      if (diff < minDiff && diff <= 45) {
        minDiff = diff;
        closestPeriod = period;
      }
    }
  }

  return closestPeriod;
};

/**
 * Reusable Academic Status Calculator
 */
const getCurrentAcademicStatus = (period, referenceDate = new Date()) => {
  const res = getPeriodStatus(period, referenceDate);
  if (res.status === 'CURRENT') {
    return {
      status: 'LIVE',
      label: 'LIVE',
      isLive: true,
      minutesRemaining: res.minutesRemaining
    };
  } else if (res.status === 'UPCOMING') {
    return {
      status: 'UPCOMING',
      label: 'UPCOMING',
      isLive: false,
      minutesUntilStart: res.minutesUntilStart
    };
  } else {
    return {
      status: 'COMPLETED',
      label: 'COMPLETED',
      isLive: false,
      minutesRemaining: 0
    };
  }
};

const {
  parseTimeToMinutes,
  parsePeriodNumber,
  sortPeriodsChronologically,
  sortTimetableEntries
} = require('./timetableSort');

module.exports = {
  DAYS_OF_WEEK,
  ACADEMIC_TIMEZONE,
  getKolkataAcademicDateTime,
  normalizeWeekday,
  parse12HourTimeToMinutes,
  parseTimeToMinutes,
  parsePeriodNumber,
  format12HourTime,
  formatAcademicDate,
  getPeriodStatus,
  findPeriodForTime,
  getCurrentAcademicStatus,
  sortPeriodsChronologically,
  sortTimetableEntries
};
