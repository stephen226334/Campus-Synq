import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Calendar, ArrowRightLeft, Info, BookOpen, Users, MapPin } from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import SubstitutionModal from '../../components/faculty/SubstitutionModal';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';
import { sortPeriodsChronologically, sortTimetableEntries } from '../../utils/timetableSort';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyWeeklyPage = () => {
  const { user } = useAuth();
  const [weeklySessions, setWeeklySessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Mobile active day view
  const [mobileSelectedDay, setMobileSelectedDay] = useState(() => {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(today) ? today : 'Monday';
  });

  const [selectedSessionForSub, setSelectedSessionForSub] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  const fetchSchedule = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const res = await facultyApi.getWeeklyTimetable();
      if (res && res.data) {
        setWeeklySessions(sortTimetableEntries(res.data));
      }
    } catch (err) {
      console.error('Failed to load weekly schedule:', err);
      setError(err.message || 'Unable to load weekly schedule.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useRealtimeEvents(() => fetchSchedule(true));

  // Extract distinct periods sorted chronologically by start time
  const distinctPeriods = useMemo(() => {
    const map = new Map();
    weeklySessions.forEach((s) => {
      if (s.period?._id && !map.has(s.period._id.toString())) {
        map.set(s.period._id.toString(), s.period);
      }
    });

    return sortPeriodsChronologically(Array.from(map.values()));
  }, [weeklySessions]);

  // Lookup map: `${day}_${periodId}` -> session
  const scheduleLookup = useMemo(() => {
    const lookup = {};
    weeklySessions.forEach((s) => {
      const key = `${s.day}_${s.period?._id || s.period}`;
      lookup[key] = s;
    });
    return lookup;
  }, [weeklySessions]);

  const handleOpenSubstitution = (session) => {
    setSelectedSessionForSub(session);
    setIsSubModalOpen(true);
  };

  const handleSubstitutionSuccess = () => {
    fetchSchedule(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <LoadingSkeleton message="Constructing weekly timetable grid..." rows={6} cols={6} />
      </div>
    );
  }

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--fp-text)', letterSpacing: '-0.01em' }}>
            Weekly Academic Schedule
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--fp-secondary)', margin: 0 }}>
            Monday through Saturday schedule overview for {user?.fullName}
          </p>
        </div>

        <button
          type="button"
          className="fp-btn-outline"
          onClick={() => fetchSchedule(false)}
        >
          <RefreshCw size={14} />
          <span>Refresh Schedule</span>
        </button>
      </div>

      {/* DESKTOP VIEW: Multi-Column Table Matrix */}
      <div className="fp-weekly-grid-desktop">
        <table className="fp-weekly-matrix-table">
          <thead>
            <tr>
              <th style={{ width: '130px', textAlign: 'left' }}>Period / Time</th>
              {DAYS.map((day) => {
                const isToday = day === todayName;
                return (
                  <th
                    key={day}
                    style={{
                      backgroundColor: isToday ? 'var(--fp-primary-soft)' : undefined,
                      color: isToday ? 'var(--fp-primary)' : undefined
                    }}
                  >
                    <span>{day}</span>
                    {isToday && (
                      <span
                        style={{
                          display: 'inline-block',
                          fontSize: '0.68rem',
                          padding: '1px 6px',
                          marginLeft: '6px',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--fp-primary)',
                          color: '#FFFFFF'
                        }}
                      >
                        Today
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {distinctPeriods.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--fp-secondary)' }}>
                  <Info size={32} style={{ color: 'var(--fp-muted)', marginBottom: '8px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--fp-text)' }}>No Academic Sessions Scheduled</div>
                  <div style={{ fontSize: '0.82rem' }}>You currently do not have any teaching periods scheduled across the week.</div>
                </td>
              </tr>
            ) : (
              distinctPeriods.map((period) => (
                <tr key={period._id}>
                  {/* Period label */}
                  <td className="period-label-col">
                    <div style={{ fontWeight: 800 }}>{period.periodNumber}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--fp-secondary)', fontWeight: 500 }}>
                      {period.startTime} - {period.endTime}
                    </div>
                  </td>

                  {/* Days */}
                  {DAYS.map((day) => {
                    const key = `${day}_${period._id}`;
                    const session = scheduleLookup[key];
                    const isToday = day === todayName;

                    return (
                      <td
                        key={key}
                        style={{
                          backgroundColor: isToday ? 'rgba(109, 61, 245, 0.02)' : undefined
                        }}
                      >
                        {session ? (
                          <div
                            className="fp-matrix-session-pill"
                            onClick={() => handleOpenSubstitution(session)}
                            title="Click to manage substitution"
                          >
                            <div>
                              <div className="fp-matrix-subject">{session.subject?.name}</div>
                              <div className="fp-matrix-meta">
                                <span>{session.section?.name}</span> • <span>Room {session.roomDetails?.roomNumber}</span>
                              </div>
                            </div>

                            {session.isSubstituted && (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '0.68rem',
                                  color: 'var(--fp-primary)',
                                  fontWeight: 600,
                                  marginTop: '4px'
                                }}
                              >
                                <ArrowRightLeft size={10} />
                                <span>Sub: {session.substituteFaculty?.fullName?.split(' ')[0]}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div
                            style={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--fp-muted)',
                              fontSize: '0.75rem'
                            }}
                          >
                            Free
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE / TABLET VIEW: Day Selector Tabs + Cards */}
      <div className="fp-weekly-mobile-view" style={{ display: 'none' }}>
        {/* Day selection tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
          {DAYS.map((day) => {
            const count = weeklySessions.filter((s) => s.day === day).length;
            const isSelected = mobileSelectedDay === day;
            const isToday = day === todayName;

            return (
              <button
                key={day}
                type="button"
                onClick={() => setMobileSelectedDay(day)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: isSelected ? '1px solid var(--fp-primary)' : '1px solid var(--fp-border)',
                  backgroundColor: isSelected ? 'var(--fp-primary-soft)' : 'var(--fp-card)',
                  color: isSelected ? 'var(--fp-primary)' : 'var(--fp-text)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <span>{day.slice(0, 3)}</span>
                {isToday && (
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--fp-primary)' }}></span>
                )}
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    backgroundColor: isSelected ? 'var(--fp-primary)' : 'var(--fp-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--fp-secondary)'
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Day Timetable List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: 'var(--fp-text)' }}>
              {mobileSelectedDay} Schedule
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--fp-secondary)' }}>
              {weeklySessions.filter((s) => s.day === mobileSelectedDay).length} classes
            </span>
          </div>

          {weeklySessions.filter((s) => s.day === mobileSelectedDay).length === 0 ? (
            <div className="fp-stat-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
              <Calendar size={32} style={{ color: 'var(--fp-muted)', marginBottom: '8px', margin: '0 auto' }} />
              <h4 style={{ margin: '4px 0', color: 'var(--fp-text)' }}>No classes on {mobileSelectedDay}</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--fp-secondary)' }}>You are free on this day.</p>
            </div>
          ) : (
            weeklySessions
              .filter((s) => s.day === mobileSelectedDay)
              .sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0))
              .map((session) => (
                <div
                  key={session._id}
                  className="fp-schedule-card"
                  style={{ minHeight: 'auto' }}
                >
                  <div className="fp-sched-card-top">
                    <span className="fp-sched-period-badge">{session.period?.periodNumber}</span>
                    <span className="fp-sched-time">
                      {session.period?.startTime} - {session.period?.endTime}
                    </span>
                  </div>

                  <div className="fp-sched-card-body" style={{ margin: '8px 0' }}>
                    <h3>{session.subject?.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--fp-secondary)', display: 'flex', gap: '10px' }}>
                      <span>{session.subject?.code}</span>
                      <span>•</span>
                      <span>{session.section?.name}</span>
                      <span>•</span>
                      <span>Room {session.roomDetails?.roomNumber}</span>
                    </div>
                  </div>

                  {session.isSubstituted && (
                    <div className="fp-sched-sub-pill">
                      <ArrowRightLeft size={12} />
                      <span>Sub: {session.substituteFaculty?.fullName}</span>
                    </div>
                  )}

                  <div className="fp-sched-card-actions">
                    <button
                      type="button"
                      className="fp-btn-substitute"
                      onClick={() => handleOpenSubstitution(session)}
                    >
                      <ArrowRightLeft size={13} />
                      <span>{session.isSubstituted ? 'Edit Sub' : 'Substitute'}</span>
                    </button>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Responsive media helper for mobile view */}
      <style>{`
        @media (max-width: 900px) {
          .fp-weekly-grid-desktop {
            display: none !important;
          }
          .fp-weekly-mobile-view {
            display: block !important;
          }
        }
      `}</style>

      {/* Substitution Modal */}
      <SubstitutionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        session={selectedSessionForSub}
        onSuccess={handleSubstitutionSuccess}
      />
    </div>
  );
};

export default FacultyWeeklyPage;
