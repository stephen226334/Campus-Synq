import React from 'react';
import { Users, MapPin, BookOpen, ArrowRightLeft, CheckCircle2 } from 'lucide-react';

export const CurrentClassCard = ({ session, onOpenSubstitution }) => {
  if (!session) {
    return (
      <div className="fp-spotlight-card fp-card-current-class">
        <div className="fp-spotlight-header">
          <div className="fp-spotlight-label-group">
            <span className="fp-spotlight-title">CURRENT CLASS</span>
          </div>
        </div>

        <div className="fp-spotlight-empty">
          <CheckCircle2 size={38} style={{ color: 'var(--fp-success)', marginBottom: '8px' }} />
          <h4>NO CURRENT CLASS</h4>
          <p>You are currently free.</p>
        </div>
      </div>
    );
  }

  const periodNumber = session.period?.periodNumber || 'P1';
  const startTime = session.period?.startTime || '';
  const endTime = session.period?.endTime || '';
  const subjectName = session.subject?.name || 'Class Session';
  const subjectCode = session.subject?.code || '';
  const sectionName = session.section?.name || 'Section';
  const roomNumber = session.roomDetails?.roomNumber || 'Room';

  return (
    <div className="fp-spotlight-card fp-card-current-class">
      <div>
        <div className="fp-spotlight-header">
          <div className="fp-spotlight-label-group">
            <span className="fp-spotlight-title">CURRENT CLASS</span>
            <span className="fp-badge-live">
              <span className="fp-pulse-dot"></span>
              LIVE NOW
            </span>
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
        <span style={{ fontSize: '0.82rem', color: 'var(--fp-secondary)' }}>
          {session.minutesRemaining ? `${session.minutesRemaining} mins remaining` : 'In session'}
        </span>
        {onOpenSubstitution && (
          <button
            type="button"
            className="fp-btn-outline"
            style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            onClick={() => onOpenSubstitution(session)}
          >
            <ArrowRightLeft size={13} />
            <span>Manage Sub</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default CurrentClassCard;
