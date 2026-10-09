/**
 * Academic formatting helpers for CampusSynq Dean Portal
 * Ensures consistent, professional academic administration terminology
 */

export const formatAcademicSection = (sectionName, semesterName) => {
  if (!sectionName) return '—';
  let trimmed = sectionName.trim();

  // Strip accidental redundant duplicates like "Section — Section B" or "Section - Section A"
  trimmed = trimmed.replace(/^Section\s*[—–-]\s*Section\s*/i, 'Section ');
  trimmed = trimmed.replace(/^Section\s+Section\s*/i, 'Section ');

  // If already cleanly formatted: e.g. "MSc Computer Science — Section A"
  if (trimmed.includes(' — Section ') || trimmed.includes(' – Section ')) {
    return trimmed;
  }

  // Handles "MSc Computer Science A", "BCA B", "MCA A" -> "MSc Computer Science — Section A"
  const trailingLetterMatch = trimmed.match(/^(.*)\s+([A-Z])$/);
  if (trailingLetterMatch) {
    const prefix = trailingLetterMatch[1].trim();
    const letter = trailingLetterMatch[2];
    if (prefix.toLowerCase() === 'section') {
      if (semesterName && semesterName.toLowerCase() !== 'section' && !semesterName.toLowerCase().startsWith('section')) {
        return `${semesterName} — Section ${letter}`;
      }
      return `Section ${letter}`;
    }
    return `${prefix} — Section ${letter}`;
  }

  // Handles "Section A" or "Section B" where semester is known
  if (/^Section\s+[A-Z]$/i.test(trimmed)) {
    if (semesterName && semesterName.toLowerCase() !== 'section' && !semesterName.toLowerCase().startsWith('section')) {
      return `${semesterName} — ${trimmed}`;
    }
    return trimmed;
  }

  return trimmed;
};

/**
 * Splits formatted section into program and section line
 * e.g. "MSc Computer Science — Section B" -> { program: "MSc Computer Science", section: "Section B" }
 */
export const formatAcademicSectionSplit = (sectionName, semesterName) => {
  const full = formatAcademicSection(sectionName, semesterName);
  if (full.includes(' — ')) {
    const [prog, sec] = full.split(' — ');
    return { program: prog.trim(), section: sec.trim() };
  }
  if (full.includes(' – ')) {
    const [prog, sec] = full.split(' – ');
    return { program: prog.trim(), section: sec.trim() };
  }
  return { program: '', section: full };
};

/**
 * Formats room number and secondary room type cleanly
 */
export const formatAcademicRoom = (roomNumber, roomType) => {
  if (!roomNumber) return { number: '—', type: 'Classroom' };
  const r = roomNumber.toString().trim();
  let type = roomType ? roomType.trim() : '';

  if (!type) {
    if (r.toUpperCase().includes('LAB')) type = 'Computer Lab';
    else if (r.toUpperCase().includes('AUD')) type = 'Auditorium';
    else type = 'Classroom';
  } else {
    if (type.toLowerCase() === 'lab') type = 'Computer Lab';
    else if (type.toLowerCase() === 'classroom') type = 'Classroom';
  }

  return { number: r, type };
};

/**
 * Formats time range with professional en dash: "9:00 AM – 9:50 AM"
 */
export const formatTimeRange12h = (timeRange) => {
  if (!timeRange) return '—';
  return timeRange.replace(/\s*[-—]\s*/g, ' – ');
};

/**
 * Formats faculty display name cleanly; replaces "Faculty", "undefined", etc. with professional fallback
 */
export const formatAcademicFaculty = (facultyName) => {
  if (!facultyName) return 'No faculty assigned';
  const trimmed = facultyName.trim();
  if (
    trimmed.toLowerCase() === 'faculty' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'n/a'
  ) {
    return 'No faculty assigned';
  }
  return trimmed;
};

export const formatAcademicStatus = (status, type = 'SESSION') => {
  if (!status) return '—';
  const upper = status.toString().toUpperCase().trim();

  if (type === 'ROOM') {
    if (upper === 'FREE' || upper === 'AVAILABLE') return 'AVAILABLE';
    return 'OCCUPIED';
  }

  if (type === 'FACULTY') {
    if (upper === 'FREE' || upper === 'AVAILABLE') return 'AVAILABLE';
    return 'TEACHING';
  }

  if (type === 'SUBSTITUTION') {
    if (upper === 'CONFIRMED' || upper === 'ACTIVE') return 'ACTIVE';
    if (upper === 'PENDING') return 'PENDING';
    if (upper === 'CANCELLED') return 'CANCELLED';
    if (upper === 'COMPLETED') return 'COMPLETED';
    return upper;
  }

  // Default: TIMETABLE / SESSION
  if (upper === 'LIVE' || upper === 'CURRENT' || upper === 'LIVE NOW') return 'LIVE NOW';
  if (upper === 'UPCOMING' || upper === 'SCHEDULED') return 'UPCOMING';
  if (upper === 'COMPLETED' || upper === 'FINISHED' || upper === 'DONE') return 'COMPLETED';
  if (upper === 'SUBSTITUTED') return 'SUBSTITUTED';
  if (upper === 'FREE') return 'FREE';

  return upper;
};
