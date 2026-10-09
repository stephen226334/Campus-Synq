import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  BookOpen,
  Users,
  MapPin,
  ArrowRightLeft,
  RefreshCw,
  Search
} from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import SubstitutionModal from '../../components/faculty/SubstitutionModal';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FacultyTimetablePage = () => {
  const { user } = useAuth();
  const [weeklySessions, setWeeklySessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected Day tab: defaults to current weekday if Mon-Sat, else Monday
  const [selectedDay, setSelectedDay] = useState(() => {
    const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    return DAYS.includes(currentDayName) ? currentDayName : 'Monday';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionForSub, setSelectedSessionForSub] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSchedule = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const res = await facultyApi.getWeeklyTimetable();
      if (res && res.data) {
        setWeeklySessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load faculty timetable:', err);
      setError(err.message || 'Unable to load timetable.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  useRealtimeEvents(() => fetchSchedule(true));

  // Parse "9:00 AM" to minutes from midnight
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === 'AM' && h === 12) h = 0;
    if (ampm === 'PM' && h !== 12) h += 12;
    return h * 60 + m;
  };

  const filteredSessions = useMemo(() => {
    const currentWeekday = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    return weeklySessions
      .filter((s) => s.day === selectedDay)
      .filter((s) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          s.subject?.name?.toLowerCase().includes(q) ||
          s.subject?.code?.toLowerCase().includes(q) ||
          s.section?.name?.toLowerCase().includes(q) ||
          s.roomDetails?.roomNumber?.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.period?.order || 0) - (b.period?.order || 0))
      .map((s) => {
        let statusLabel = 'SCHEDULED';
        if (selectedDay === currentWeekday) {
          const startMin = parseTimeToMinutes(s.period?.startTime);
          const endMin = parseTimeToMinutes(s.period?.endTime);
          if (startMin !== null && endMin !== null) {
            if (currentMinutes >= startMin && currentMinutes < endMin) {
              statusLabel = 'CURRENT';
            } else if (currentMinutes < startMin) {
              statusLabel = 'UPCOMING';
            } else {
              statusLabel = 'COMPLETED';
            }
          }
        }
        return { ...s, computedStatus: statusLabel };
      });
  }, [weeklySessions, selectedDay, searchQuery, currentTime]);

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
        <LoadingSkeleton message="Loading your academic timetable..." rows={5} cols={3} />
      </div>
    );
  }

  const currentDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--fp-text)', letterSpacing: '-0.01em' }}>
            Daily Timetable Schedule
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--fp-secondary)', margin: 0 }}>
            Period timings, classrooms, and course sections assigned to {user?.fullName}
          </p>
        </div>
        <button
          type="button"
          className="fp-btn-outline"
          onClick={() => fetchSchedule(false)}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Day Selector Pills */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {DAYS.map((day) => {
          const count = weeklySessions.filter((s) => s.day === day).length;
          const isSelected = selectedDay === day;
          const isToday = currentDayName === day;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                border: isSelected ? '1px solid var(--fp-primary)' : '1px solid var(--fp-border)',
                backgroundColor: isSelected ? 'var(--fp-primary-soft)' : 'var(--fp-card)',
                color: isSelected ? 'var(--fp-primary)' : 'var(--fp-text)',
                fontWeight: isSelected ? 700 : 500,
                fontSize: '0.88rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{day}</span>
              {isToday && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    backgroundColor: isSelected ? 'var(--fp-primary)' : 'var(--fp-surface)',
                    color: isSelected ? '#FFFFFF' : 'var(--fp-secondary)'
                  }}
                >
                  Today
                </span>
              )}
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  opacity: 0.8
                }}
              >
                ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* Search and summary bar */}
      <div
        className="fp-stat-card"
        style={{
          minHeight: 'auto',
          padding: '12px 18px',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px', maxWidth: '400px' }}>
          <Search size={16} style={{ color: 'var(--fp-secondary)' }} />
          <input
            type="text"
            className="fp-form-input"
            style={{ padding: '7px 12px', fontSize: '0.85rem' }}
            placeholder="Filter subject, section, room..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <span style={{ fontSize: '0.82rem', color: 'var(--fp-secondary)' }}>
          Showing <strong>{filteredSessions.length}</strong> classes on {selectedDay}
        </span>
      </div>

      {/* Timetable Cards Grid */}
      {filteredSessions.length === 0 ? (
        <div className="fp-stat-card" style={{ textAlign: 'center', padding: '40px 20px', alignItems: 'center' }}>
          <CalendarDays size={40} style={{ color: 'var(--fp-muted)', marginBottom: '8px' }} />
          <h3 style={{ margin: '4px 0', color: 'var(--fp-text)' }}>No Classes on {selectedDay}</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--fp-secondary)' }}>
            {searchQuery
              ? `No classes matching "${searchQuery}" on ${selectedDay}.`
              : `You have no scheduled teaching periods on ${selectedDay}.`}
          </p>
        </div>
      ) : (
        <div className="fp-schedule-cards-grid">
          {filteredSessions.map((session) => {
            const isCurrent = session.computedStatus === 'CURRENT';
            const isCompleted = session.computedStatus === 'COMPLETED';

            return (
              <div
                key={session._id}
                className={`fp-schedule-card ${isCurrent ? 'is-current' : ''} ${isCompleted ? 'is-completed' : ''}`}
              >
                <div>
                  <div className="fp-sched-card-top">
                    <span className="fp-sched-period-badge">{session.period?.periodNumber}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {session.computedStatus !== 'SCHEDULED' && (
                        <span
                          className={`fp-badge-status ${
                            isCurrent ? 'current' : isCompleted ? 'completed' : 'upcoming'
                          }`}
                        >
                          {isCurrent ? 'LIVE NOW' : session.computedStatus}
                        </span>
                      )}
                      <span className="fp-sched-time">
                        {session.period?.startTime} - {session.period?.endTime}
                      </span>
                    </div>
                  </div>

                  <div className="fp-sched-card-body" style={{ marginTop: '12px' }}>
                    <h3>{session.subject?.name}</h3>
                    <span className="fp-sched-code">{session.subject?.code}</span>
                  </div>
                </div>

                <div>
                  <div className="fp-sched-meta-row">
                    <span className="fp-sched-meta-item">
                      <strong>Section:</strong> {session.section?.name}
                    </span>
                    <span className="fp-sched-meta-item">
                      <strong>Room:</strong> {session.roomDetails?.roomNumber} ({session.roomType || 'Room'})
                    </span>
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
                      <span>{session.isSubstituted ? 'Edit Substitution' : 'Request Substitution'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

export default FacultyTimetablePage;
