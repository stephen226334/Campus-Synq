const EventEmitter = require('events');

class AcademicEventEmitter extends EventEmitter {}

const academicEvents = new AcademicEventEmitter();

// Event constants for real-time Socket.IO readiness
const ACADEMIC_EVENTS = {
  TIMETABLE_CREATED: 'TIMETABLE_CREATED',
  TIMETABLE_UPDATED: 'TIMETABLE_UPDATED',
  TIMETABLE_DELETED: 'TIMETABLE_DELETED',
  FACULTY_UPDATED: 'FACULTY_UPDATED',
  ROOM_UPDATED: 'ROOM_UPDATED',
  SUBSTITUTION_UPDATED: 'SUBSTITUTION_UPDATED'
};

// Log emitted events in non-test environments
Object.values(ACADEMIC_EVENTS).forEach((eventName) => {
  academicEvents.on(eventName, (data) => {
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[AcademicEvent: ${eventName}]`, {
        timestamp: new Date().toISOString(),
        id: data?.id || data?._id
      });
    }
  });
});

module.exports = {
  academicEvents,
  ACADEMIC_EVENTS
};
