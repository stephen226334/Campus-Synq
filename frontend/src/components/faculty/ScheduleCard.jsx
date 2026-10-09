import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export const ScheduleCard = ({ session, onOpenSubstitution }) => {
  const isCurrent = session.statusLabel === 'CURRENT';
  const isCompleted = session.statusLabel === 'COMPLETED';

  const periodNumber = session.period?.periodNumber || 'P1';
  const startTime = session.period?.startTime || '';
  const endTime = session.period?.endTime || '';
  const timeRange = startTime && endTime ? `${startTime} - ${endTime}` : '';
  const subjectName = session.subject?.name || 'Academic Class';
  const subjectCode = session.subject?.code || '';
  const sectionName = session.section?.name || 'Section';
  const roomNumber = session.roomDetails?.roomNumber || 'Room';

  let statusBadgeClass = 'completed';
  if (isCurrent) statusBadgeClass = 'current';
  else if (session.statusLabel === 'UPCOMING') statusBadgeClass = 'upcoming';

  return (
    <div
      className={`fp-schedule-card ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''}`}
    >
      <div>
        <div className="fp-sched-card-top">
          <span className="fp-sched-period-badge">{periodNumber}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {session.statusLabel && (
              <span className={`fp-badge-status ${statusBadgeClass}`}>
                {isCurrent ? 'LIVE NOW' : session.statusLabel}
              </span>
            )}
            <span className="fp-sched-time">{timeRange}</span>
          </div>
        </div>

        <div className="fp-sched-card-body" style={{ marginTop: '12px' }}>
          <h3>{subjectName}</h3>
          {subjectCode && <span className="fp-sched-code">{subjectCode}</span>}
        </div>
      </div>

      <div>
        <div className="fp-sched-meta-row">
          <span className="fp-sched-meta-item">
            <strong>Section:</strong> {sectionName}
          </span>
          <span className="fp-sched-meta-item">
            <strong>Room:</strong> {roomNumber}
          </span>
        </div>

        {session.isSubstituted && (
          <div className="fp-sched-sub-pill">
            <ArrowRightLeft size={12} />
            <span>
              Sub: <strong>{session.substituteFaculty?.fullName || 'Assigned'}</strong>
            </span>
          </div>
        )}

        {onOpenSubstitution && (
          <div className="fp-sched-card-actions">
            <button
              type="button"
              className="fp-btn-substitute"
              onClick={() => onOpenSubstitution(session)}
            >
              <ArrowRightLeft size={13} />
              <span>{session.isSubstituted ? 'Edit Substitution' : 'Request Substitution'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleCard;
