import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import ScheduleCard from './ScheduleCard';

export const TodaySchedule = ({ schedule, dayName, fullDateStr, onOpenSubstitution }) => {
  return (
    <section className="fp-section-container" aria-label="Today's Schedule">
      <div className="fp-section-header">
        <div className="fp-section-title-group">
          <h2>Today's Schedule</h2>
          <p>
            Your personalized academic timetable for {dayName}, {fullDateStr}
          </p>
        </div>

        <Link to="/faculty/weekly-schedule" className="fp-link-btn">
          <span>Full Weekly View</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {(!schedule || schedule.length === 0) ? (
        <div
          className="fp-schedule-card"
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CalendarDays size={40} style={{ color: 'var(--fp-muted)', marginBottom: '8px' }} />
          <h3 style={{ fontSize: '1.05rem', margin: '4px 0', color: 'var(--fp-text)' }}>
            No Scheduled Classes Today
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--fp-secondary)', margin: 0 }}>
            You do not have any teaching periods scheduled for {dayName}.
          </p>
        </div>
      ) : (
        <div className="fp-schedule-cards-grid">
          {schedule.map((session) => (
            <ScheduleCard
              key={session._id}
              session={session}
              onOpenSubstitution={onOpenSubstitution}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TodaySchedule;
