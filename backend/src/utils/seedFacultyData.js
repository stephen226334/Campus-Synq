const mongoose = require('mongoose');
const Faculty = require('../models/Faculty');
const Period = require('../models/Period');
const Semester = require('../models/Semester');
const ClassSection = require('../models/ClassSection');
const Subject = require('../models/Subject');
const Classroom = require('../models/Classroom');
const Lab = require('../models/Lab');
const Auditorium = require('../models/Auditorium');
const TimetableEntry = require('../models/TimetableEntry');
const Admin = require('../models/Admin');
const Substitution = require('../models/Substitution');
const { MONGODB_URI } = require('../config/env');

const seedFacultyPortalData = async () => {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    console.log('Seeding / verifying Faculty Portal demonstration accounts & timetable...');

    // 1. Periods (P1 to P6)
    const periodsData = [
      { periodNumber: 'P1', startTime: '9:00 AM', endTime: '9:50 AM', order: 1 },
      { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM', order: 2 },
      { periodNumber: 'P3', startTime: '11:00 AM', endTime: '11:50 AM', order: 3 },
      { periodNumber: 'P4', startTime: '1:00 PM', endTime: '1:50 PM', order: 4 },
      { periodNumber: 'P5', startTime: '2:00 PM', endTime: '2:50 PM', order: 5 },
      { periodNumber: 'P6', startTime: '3:00 PM', endTime: '3:50 PM', order: 6 }
    ];

    const periodMap = {};
    for (const p of periodsData) {
      const doc = await Period.findOneAndUpdate(
        { periodNumber: p.periodNumber },
        { ...p, status: 'ACTIVE' },
        { upsert: true, new: true }
      );
      periodMap[p.periodNumber] = doc;
    }

    // 2. Master Data Entities
    const semester = await Semester.findOneAndUpdate(
      { name: 'Semester 5', academicYear: '2026-2027' },
      { name: 'Semester 5', academicYear: '2026-2027', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const sectionA = await ClassSection.findOneAndUpdate(
      { name: 'Section A', semester: semester._id },
      { name: 'Section A', semester: semester._id, capacity: 60, status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const sectionB = await ClassSection.findOneAndUpdate(
      { name: 'Section B', semester: semester._id },
      { name: 'Section B', semester: semester._id, capacity: 60, status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const subjectDS = await Subject.findOneAndUpdate(
      { code: 'CS-301' },
      { name: 'Data Structures', code: 'CS-301', semester: semester._id, credits: 4, type: 'THEORY', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const subjectDB = await Subject.findOneAndUpdate(
      { code: 'CS-302' },
      { name: 'Database Systems', code: 'CS-302', semester: semester._id, credits: 4, type: 'THEORY', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const subjectOS = await Subject.findOneAndUpdate(
      { code: 'CS-303' },
      { name: 'Operating Systems', code: 'CS-303', semester: semester._id, credits: 4, type: 'THEORY', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const subjectCN = await Subject.findOneAndUpdate(
      { code: 'CS-304' },
      { name: 'Computer Networks', code: 'CS-304', semester: semester._id, credits: 4, type: 'THEORY', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const subjectAI = await Subject.findOneAndUpdate(
      { code: 'CS-305' },
      { name: 'Artificial Intelligence', code: 'CS-305', semester: semester._id, credits: 4, type: 'THEORY', status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    const roomCS101 = await Classroom.findOneAndUpdate(
      { roomNumber: 'CS-101' },
      { roomNumber: 'CS-101', capacity: 60, floor: '1st Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );

    const roomCS201 = await Classroom.findOneAndUpdate(
      { roomNumber: 'CS-201' },
      { roomNumber: 'CS-201', capacity: 60, floor: '2nd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );

    const lab01 = await Lab.findOneAndUpdate(
      { labNumber: 'LAB-01' },
      { labNumber: 'LAB-01', labName: 'Systems & Networking Lab', capacity: 45, floor: 'Ground Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );

    // 3. Faculty Accounts
    // Subu
    let subu = await Faculty.findOne({ officialEmail: 'subu@campussynq.com' });
    if (!subu) {
      subu = new Faculty({
        fullName: 'Subu',
        facultyId: 'FAC-001',
        officialEmail: 'subu@campussynq.com',
        personalEmail: 'subu.personal@example.com',
        phone: '9876543210',
        designation: 'Assistant Professor',
        department: 'Computer Science Department',
        password: 'password@123',
        role: 'FACULTY',
        status: 'ACTIVE',
        assignedSubjects: [subjectDS._id, subjectDB._id, subjectOS._id],
        assignedSections: [sectionA._id, sectionB._id]
      });
      await subu.save();
    } else {
      subu.password = 'password@123';
      subu.assignedSubjects = [subjectDS._id, subjectDB._id, subjectOS._id];
      subu.assignedSections = [sectionA._id, sectionB._id];
      await subu.save();
    }

    // John
    let john = await Faculty.findOne({ officialEmail: 'john@campussynq.com' });
    if (!john) {
      john = new Faculty({
        fullName: 'John',
        facultyId: 'FAC-002',
        officialEmail: 'john@campussynq.com',
        personalEmail: 'john.personal@example.com',
        phone: '9876543211',
        designation: 'Associate Professor',
        department: 'Computer Science Department',
        password: 'password@123',
        role: 'FACULTY',
        status: 'ACTIVE',
        assignedSubjects: [subjectCN._id, subjectAI._id],
        assignedSections: [sectionA._id, sectionB._id]
      });
      await john.save();
    } else {
      john.password = 'password@123';
      john.assignedSubjects = [subjectCN._id, subjectAI._id];
      john.assignedSections = [sectionA._id, sectionB._id];
      await john.save();
    }

    // 4. Subu's Timetable Schedule across the week
    const subuSchedule = [
      // Monday
      { day: 'Monday', period: periodMap.P1._id, subject: subjectDB._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS101._id, roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 } },
      { day: 'Monday', period: periodMap.P2._id, subject: subjectDS._id, section: sectionB._id, roomType: 'Classroom', roomId: roomCS201._id, roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 } },
      { day: 'Monday', period: periodMap.P3._id, subject: subjectOS._id, section: sectionA._id, roomType: 'Lab', roomId: lab01._id, roomDetails: { roomNumber: 'LAB-01', name: 'Systems & Networking Lab', capacity: 45 } },
      // Tuesday
      { day: 'Tuesday', period: periodMap.P1._id, subject: subjectOS._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS201._id, roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 } },
      { day: 'Tuesday', period: periodMap.P2._id, subject: subjectDS._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS101._id, roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 } },
      // Wednesday
      { day: 'Wednesday', period: periodMap.P1._id, subject: subjectCN._id, section: sectionB._id, roomType: 'Lab', roomId: lab01._id, roomDetails: { roomNumber: 'LAB-01', name: 'Systems & Networking Lab', capacity: 45 } },
      { day: 'Wednesday', period: periodMap.P3._id, subject: subjectDB._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS101._id, roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 } },
      // Thursday
      { day: 'Thursday', period: periodMap.P1._id, subject: subjectDB._id, section: sectionB._id, roomType: 'Classroom', roomId: roomCS101._id, roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 } },
      { day: 'Thursday', period: periodMap.P2._id, subject: subjectOS._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS201._id, roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 } },
      // Friday
      { day: 'Friday', period: periodMap.P1._id, subject: subjectAI._id, section: sectionA._id, roomType: 'Classroom', roomId: roomCS201._id, roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 } },
      { day: 'Friday', period: periodMap.P2._id, subject: subjectDS._id, section: sectionB._id, roomType: 'Classroom', roomId: roomCS101._id, roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 } },
      // Saturday
      { day: 'Saturday', period: periodMap.P1._id, subject: subjectOS._id, section: sectionB._id, roomType: 'Lab', roomId: lab01._id, roomDetails: { roomNumber: 'LAB-01', name: 'Systems & Networking Lab', capacity: 45 } }
    ];

    for (const item of subuSchedule) {
      await TimetableEntry.findOneAndUpdate(
        { day: item.day, period: item.period, faculty: subu._id },
        {
          ...item,
          semester: semester._id,
          faculty: subu._id,
          status: 'ACTIVE'
        },
        { upsert: true, new: true }
      );
    }

    // 4b. Seed Additional Faculty: Prof. Ravi and Dr. Kumar
    let ravi = await Faculty.findOne({ officialEmail: 'ravi@campussynq.com' });
    if (!ravi) {
      ravi = new Faculty({
        fullName: 'Prof. Ravi',
        facultyId: 'FAC-RAV-03',
        officialEmail: 'ravi@campussynq.com',
        personalEmail: 'ravi.personal@example.com',
        phone: '9876543212',
        designation: 'Associate Professor',
        department: 'Computer Science Department',
        password: 'password@123',
        role: 'FACULTY',
        status: 'ACTIVE',
        assignedSubjects: [subjectDB._id, subjectDS._id],
        assignedSections: [sectionA._id]
      });
      await ravi.save();
    }

    let kumar = await Faculty.findOne({ officialEmail: 'kumar@campussynq.com' });
    if (!kumar) {
      kumar = new Faculty({
        fullName: 'Dr. Kumar',
        facultyId: 'FAC-KUM-04',
        officialEmail: 'kumar@campussynq.com',
        personalEmail: 'kumar.personal@example.com',
        phone: '9876543213',
        designation: 'Assistant Professor',
        department: 'Computer Science Department',
        password: 'password@123',
        role: 'FACULTY',
        status: 'ACTIVE',
        assignedSubjects: [subjectDS._id, subjectOS._id],
        assignedSections: [sectionB._id]
      });
      await kumar.save();
    }

    // 4c. Additional Classrooms: B314, B315, B201, B205, B306, B310, C102, C201
    const roomB314 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B314' },
      { roomNumber: 'B314', name: 'Lecture Hall B314', capacity: 60, floor: '3rd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomB315 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B315' },
      { roomNumber: 'B315', name: 'Lecture Hall B315', capacity: 60, floor: '3rd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomB201 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B201' },
      { roomNumber: 'B201', name: 'Classroom B201', capacity: 50, floor: '2nd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomB205 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B205' },
      { roomNumber: 'B205', name: 'Classroom B205', capacity: 50, floor: '2nd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomB306 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B306' },
      { roomNumber: 'B306', name: 'Classroom B306', capacity: 45, floor: '3rd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomB310 = await Classroom.findOneAndUpdate(
      { roomNumber: 'B310' },
      { roomNumber: 'B310', name: 'Classroom B310', capacity: 45, floor: '3rd Floor', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomC102 = await Classroom.findOneAndUpdate(
      { roomNumber: 'C102' },
      { roomNumber: 'C102', name: 'Classroom C102', capacity: 60, floor: '1st Floor Block C', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );
    const roomC201 = await Classroom.findOneAndUpdate(
      { roomNumber: 'C201' },
      { roomNumber: 'C201', name: 'Classroom C201', capacity: 60, floor: '2nd Floor Block C', status: 'AVAILABLE' },
      { upsert: true, new: true }
    );

    // 4d. Additional Sections: MSc Computer Science A, BCA B, MCA A, MCA B
    const secMScA = await ClassSection.findOneAndUpdate(
      { name: 'MSc Computer Science A' },
      { name: 'MSc Computer Science A', semester: semester._id, capacity: 40, status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    const secBCAB = await ClassSection.findOneAndUpdate(
      { name: 'BCA B' },
      { name: 'BCA B', semester: semester._id, capacity: 55, status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    const secMCAA = await ClassSection.findOneAndUpdate(
      { name: 'MCA A' },
      { name: 'MCA A', semester: semester._id, capacity: 50, status: 'ACTIVE' },
      { upsert: true, new: true }
    );
    const secMCAB = await ClassSection.findOneAndUpdate(
      { name: 'MCA B' },
      { name: 'MCA B', semester: semester._id, capacity: 50, status: 'ACTIVE' },
      { upsert: true, new: true }
    );

    // 4e. Seed Demo Timetables for B314 and Prof. Ravi:
    // Monday P1: B314 -> Dr. Kumar -> Java (DS) -> MSc CS A
    await TimetableEntry.findOneAndUpdate(
      { day: 'Monday', period: periodMap.P1._id, roomId: roomB314._id },
      {
        day: 'Monday',
        period: periodMap.P1._id,
        subject: subjectDS._id,
        section: secMScA._id,
        semester: semester._id,
        faculty: kumar._id,
        roomType: 'Classroom',
        roomId: roomB314._id,
        roomDetails: { roomNumber: 'B314', name: 'Lecture Hall B314', capacity: 60 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Monday P2: B314 -> Prof. Ravi -> DBMS -> MSc CS A
    await TimetableEntry.findOneAndUpdate(
      { day: 'Monday', period: periodMap.P2._id, roomId: roomB314._id },
      {
        day: 'Monday',
        period: periodMap.P2._id,
        subject: subjectDB._id,
        section: secMScA._id,
        semester: semester._id,
        faculty: ravi._id,
        roomType: 'Classroom',
        roomId: roomB314._id,
        roomDetails: { roomNumber: 'B314', name: 'Lecture Hall B314', capacity: 60 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Monday P3: B314 -> John -> OS -> MCA B
    await TimetableEntry.findOneAndUpdate(
      { day: 'Monday', period: periodMap.P3._id, roomId: roomB314._id },
      {
        day: 'Monday',
        period: periodMap.P3._id,
        subject: subjectOS._id,
        section: secMCAB._id,
        semester: semester._id,
        faculty: john._id,
        roomType: 'Classroom',
        roomId: roomB314._id,
        roomDetails: { roomNumber: 'B314', name: 'Lecture Hall B314', capacity: 60 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Monday P2: B315 -> Subu -> AI -> BCA B
    await TimetableEntry.findOneAndUpdate(
      { day: 'Monday', period: periodMap.P2._id, roomId: roomB315._id },
      {
        day: 'Monday',
        period: periodMap.P2._id,
        subject: subjectAI._id,
        section: secBCAB._id,
        semester: semester._id,
        faculty: subu._id,
        roomType: 'Classroom',
        roomId: roomB315._id,
        roomDetails: { roomNumber: 'B315', name: 'Lecture Hall B315', capacity: 60 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Monday P2: C201 -> Alan -> CN -> MCA A
    let alan = await Faculty.findOne({ officialEmail: 'alan@campussynq.com' });
    if (alan) {
      await TimetableEntry.findOneAndUpdate(
        { day: 'Monday', period: periodMap.P2._id, roomId: roomC201._id },
        {
          day: 'Monday',
          period: periodMap.P2._id,
          subject: subjectCN._id,
          section: secMCAA._id,
          semester: semester._id,
          faculty: alan._id,
          roomType: 'Classroom',
          roomId: roomC201._id,
          roomDetails: { roomNumber: 'C201', name: 'Classroom C201', capacity: 60 },
          status: 'ACTIVE'
        },
        { upsert: true, new: true }
      );
    }

    // Prof. Ravi on other days:
    // Tuesday P2 in B205 (BCA B)
    await TimetableEntry.findOneAndUpdate(
      { day: 'Tuesday', period: periodMap.P2._id, faculty: ravi._id },
      {
        day: 'Tuesday',
        period: periodMap.P2._id,
        subject: subjectDB._id,
        section: secBCAB._id,
        semester: semester._id,
        faculty: ravi._id,
        roomType: 'Classroom',
        roomId: roomB205._id,
        roomDetails: { roomNumber: 'B205', name: 'Classroom B205', capacity: 50 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // Wednesday P1 in LAB-01
    await TimetableEntry.findOneAndUpdate(
      { day: 'Wednesday', period: periodMap.P1._id, faculty: ravi._id },
      {
        day: 'Wednesday',
        period: periodMap.P1._id,
        subject: subjectDB._id,
        section: secMScA._id,
        semester: semester._id,
        faculty: ravi._id,
        roomType: 'Lab',
        roomId: lab01._id,
        roomDetails: { roomNumber: 'LAB-01', name: 'Systems & Networking Lab', capacity: 45 },
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // 5a. Official Admin Account
    let admin = await Admin.findOne({ email: 'admin@campussynq.com' });
    if (!admin) {
      admin = new Admin({
        fullName: 'Dr. Sarah Connor',
        email: 'admin@campussynq.com',
        password: 'AdminPassword2026!',
        role: 'ADMIN',
        department: 'Computer Science Department',
        status: 'ACTIVE'
      });
      await admin.save();
      console.log('Seeded official Admin account: admin@campussynq.com');
    } else {
      admin.role = 'ADMIN';
      admin.password = 'AdminPassword2026!';
      admin.status = 'ACTIVE';
      await admin.save();
    }

    // 5b. Official Dean Account
    let dean = await Admin.findOne({ email: 'dean@campussynq.com' });
    if (!dean) {
      dean = new Admin({
        fullName: 'Prof. Robert Vance (Dean)',
        email: 'dean@campussynq.com',
        password: 'Password123',
        role: 'DEAN',
        department: 'Computer Science Department',
        status: 'ACTIVE'
      });
      await dean.save();
      console.log('Seeded official Dean account: dean@campussynq.com');
    } else {
      dean.role = 'DEAN';
      dean.password = 'Password123';
      dean.status = 'ACTIVE';
      await dean.save();
    }

    // 6. Auditorium Verification
    await Auditorium.findOneAndUpdate(
      { auditoriumNumber: 'AUD-01' },
      {
        auditoriumName: 'Alan Turing Memorial Auditorium',
        auditoriumNumber: 'AUD-01',
        capacity: 250,
        status: 'ACTIVE'
      },
      { upsert: true, new: true }
    );

    // 7. Demonstration Substitutions (PENDING and CONFIRMED)
    const existingSubsCount = await Substitution.countDocuments();
    if (existingSubsCount < 3) {
      const p3Entry = await TimetableEntry.findOne({ faculty: subu._id, day: 'Monday' });
      if (p3Entry) {
        // Pending substitution
        await Substitution.findOneAndUpdate(
          { timetableEntry: p3Entry._id, date: '2026-10-06' },
          {
            timetableEntry: p3Entry._id,
            day: p3Entry.day,
            date: '2026-10-06',
            period: p3Entry.period,
            originalFaculty: subu._id,
            substituteFaculty: john._id,
            subject: p3Entry.subject,
            section: p3Entry.section,
            roomType: p3Entry.roomType,
            roomId: p3Entry.roomId,
            roomDetails: p3Entry.roomDetails,
            reason: 'Attending IEEE CS Department Faculty Symposium',
            status: 'PENDING',
            createdBy: subu._id
          },
          { upsert: true, new: true }
        );

        // Confirmed active substitution
        const p2Entry = await TimetableEntry.findOne({ faculty: subu._id, day: 'Wednesday' });
        if (p2Entry) {
          await Substitution.findOneAndUpdate(
            { timetableEntry: p2Entry._id, date: '2026-10-06' },
            {
              timetableEntry: p2Entry._id,
              day: p2Entry.day,
              date: '2026-10-06',
              period: p2Entry.period,
              originalFaculty: subu._id,
              substituteFaculty: john._id,
              subject: p2Entry.subject,
              section: p2Entry.section,
              roomType: p2Entry.roomType,
              roomId: p2Entry.roomId,
              roomDetails: p2Entry.roomDetails,
              reason: 'Department laboratory research coordination',
              status: 'CONFIRMED',
              createdBy: subu._id
            },
            { upsert: true, new: true }
          );
        }
      }
    }

    console.log('Faculty Portal and Dean accounts, auditorium, and demonstration data verified.');
  } catch (error) {
    console.error('Error seeding faculty/dean demo data:', error);
  }
};

module.exports = seedFacultyPortalData;

if (require.main === module) {
  seedFacultyPortalData().then(() => process.exit(0));
}
