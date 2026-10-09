const Subject = require('../models/Subject');
const Semester = require('../models/Semester');
const ClassSection = require('../models/ClassSection');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const Faculty = require('../models/Faculty');
const TimetableEntry = require('../models/TimetableEntry');
const { successResponse } = require('../utils/response');

/**
 * Get Real Database Counts and Operational Timelines (Stage 1 + Stage 2)
 * GET /api/v1/admin/dashboard
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayIndex = new Date().getDay();
    const todayWeekday = days[todayIndex];

    const [
      subjectsCount,
      semestersCount,
      classSectionsCount,
      classroomsCount,
      labsCount,
      auditoriumsCount,
      totalFacultyCount,
      activeFacultyCount,
      totalTimetableCount,
      todayClasses,
      recentSubjects,
      recentClassrooms,
      recentSections
    ] = await Promise.all([
      Subject.countDocuments(),
      Semester.countDocuments(),
      ClassSection.countDocuments(),
      Classroom.countDocuments(),
      Lab.countDocuments(),
      Auditorium.countDocuments(),
      Faculty.countDocuments(),
      Faculty.countDocuments({ status: 'ACTIVE' }),
      TimetableEntry.countDocuments({ status: 'ACTIVE' }),
      TimetableEntry.find({ day: todayWeekday, status: 'ACTIVE' })
        .populate('period')
        .populate('subject', 'name code')
        .populate('faculty', 'fullName facultyId designation')
        .populate('section', 'name')
        .populate('semester', 'name')
        .sort({ 'period.order': 1 })
        .lean(),
      Subject.find()
        .populate('semester', 'name academicYear')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Classroom.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      ClassSection.find()
        .populate('semester', 'name academicYear')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    return successResponse(
      res,
      {
        counts: {
          // Stage 1 metrics
          subjects: subjectsCount,
          semesters: semestersCount,
          classSections: classSectionsCount,
          classrooms: classroomsCount,
          labs: labsCount,
          auditoriums: auditoriumsCount,
          // Stage 2 metrics
          totalFaculty: totalFacultyCount,
          activeFaculty: activeFacultyCount,
          totalTimetableEntries: totalTimetableCount,
          todayClassesCount: todayClasses.length
        },
        todaySchedule: {
          weekday: todayWeekday,
          classes: todayClasses
        },
        recentData: {
          subjects: recentSubjects,
          classrooms: recentClassrooms,
          sections: recentSections
        }
      },
      'Dashboard stats retrieved'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats
};
