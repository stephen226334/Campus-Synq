import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export const SubstitutionCard = ({ substitutions = [] }) => {
  const displaySubs = substitutions.slice(0, 3);

  return (
    <div className="fp-substitutions-card">
      <div>
        <div className="fp-bottom-card-header">
          <h3>Substitutions</h3>
          <Link to="/faculty/substitutions" className="fp-link-btn" style={{ fontSize: '0.8rem' }}>
            <span>View All</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {displaySubs.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CheckCircle2 size={32} style={{ color: 'var(--fp-success)', marginBottom: '6px' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--fp-text)' }}>
              No Active Substitutions
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--fp-secondary)', marginTop: '2px' }}>
              All your scheduled teaching periods are currently assigned to you.
            </span>
          </div>
        ) : (
          <div className="fp-subs-list">
            {displaySubs.map((sub) => {
              const periodLabel = sub.period?.periodNumber || 'Period';
              const timeRange = sub.period?.startTime && sub.period?.endTime
                ? `${sub.period.startTime} - ${sub.period.endTime}`
                : '';
              const subjectName = sub.subject?.name || 'Subject';
              const sectionName = sub.section?.name || 'Section';
              const roomNumber = sub.roomDetails?.roomNumber || 'Room';
              const subFaculty = sub.substituteFaculty?.fullName || 'Assigned Faculty';
              const status = sub.status || 'Updated';

              return (
                <div key={sub._id} className="fp-sub-item-compact">
                  <div className="fp-sub-item-left">
                    <span className="fp-sub-item-subject">
                      {periodLabel} • {subjectName}
                    </span>
                    <span className="fp-sub-item-period">
                      {timeRange} | {sectionName} • Room {roomNumber}
                    </span>
                    <span style={{ fontSize: '0.73rem', color: 'var(--fp-primary)', fontWeight: 600 }}>
                      Sub: {subFaculty}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '9999px',
                        backgroundColor: 'var(--fp-primary-soft)',
                        color: 'var(--fp-primary)',
                        textTransform: 'uppercase'
                      }}
                    >
                      {status}
                    </span>
                    <Link
                      to="/faculty/substitutions"
                      className="fp-link-btn"
                      style={{ fontSize: '0.75rem' }}
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: '14px', borderTop: '1px solid var(--fp-border-light)', paddingTop: '12px' }}>
        <Link to="/faculty/substitutions" className="fp-btn-outline" style={{ width: '100%', fontSize: '0.82rem' }}>
          <ArrowRightLeft size={14} />
          <span>Manage Substitution Requests</span>
        </Link>
      </div>
    </div>
  );
};

export default SubstitutionCard;
