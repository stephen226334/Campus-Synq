import React from 'react';
import { Users, MapPin, BookOpen, Clock, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

export const NextClassCard = ({ session, onOpenSubstitution }) => {
  if (!session) {
    return (
      <div className="fp-spotlight-card fp-card-next-class">
        <div className="fp-spotlight-header">
          <div className="fp-spotlight-label-group">
            <span className="fp-spotlight-title">NEXT CLASS</span>
          </div>
        </div>

        <div className="fp-spotlight-empty">
          <CheckCircle2 size={38} style={{ color: 'var(--fp-primary)', marginBottom: '8px' }} />
          <h4>NO UPCOMING CLASSES</h4>
          <p>You have finished all scheduled classes for today.</p>
        </div>
      </div>
    );
  }

  const periodNumber = session.period?.periodNumber || 'P2';
  const startTime = session.period?.startTime || '';
  const endTime = session.period?.endTime || '';
  const subjectName = session.subject?.name || 'Class Session';
  const subjectCode = session.subject?.code || '';
  const sectionName = session.section?.name || 'Section';
  const roomNumber = session.roomDetails?.roomNumber || 'Room';

  const countdownText = session.minutesUntilStart !== null && session.minutesUntilStart !== undefined
    ? session.minutesUntilStart <= 0
      ? 'Starting now'
      : `Starts in ${session.minutesUntilStart} minutes`
    : 'Upcoming today';

  return (
    <div className="fp-spotlight-card fp-card-next-class">
      <div>
        <div className="fp-spotlight-header">
          <div className="fp-spotlight-label-group">
            <span className="fp-spotlight-title">NEXT CLASS</span>
          </div>
          <span className="fp-spotlight-period">
            {periodNumber} • {startTime} - {endTime}
          </span>
        </div>

        <h3 className="fp-spotlight-subject">{subjectName}</h3>

        <div className="fp-spotlight-meta-tags">
          <span className="fp-meta-tag">
            <BookOpen size={14} />
            {subjectCode}
          </span>
          <span className="fp-meta-tag">
            <Users size={14} />
            {sectionName}
          </span>
          <span className="fp-meta-tag">
            <MapPin size={14} />
            Room {roomNumber}
          </span>
        </div>

        {session.isSubstituted && (
          <div className="fp-sched-sub-pill">
            <ArrowRightLeft size={13} />
            <span>Substitute: <strong>{session.substituteFaculty?.fullName || 'Assigned'}</strong></span>
          </div>
        )}
      </div>

      <div className="fp-spotlight-footer">
        <span className="fp-countdown-text">
          <Clock size={14} />
          {countdownText}
        </span>
        {onOpenSubstitution && (
          <button
            type="button"
            className="fp-btn-primary"
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            onClick={() => onOpenSubstitution(session)}
          >
            <ArrowRightLeft size={13} />
            <span>Request Sub</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default NextClassCard;
