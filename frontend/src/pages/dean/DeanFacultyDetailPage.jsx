import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  Mail, 
  Building, 
  Clock, 
  BookOpen, 
  Layers, 
  DoorOpen, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar,
  ExternalLink
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const DeanFacultyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState('ALL');

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await deanApi.getFacultyDetails(id);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load faculty details:', err);
        setError(err.response?.data?.message || 'Faculty member not found or unavailable');
        showToast('Unable to load faculty details', 'error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchDetails();
    }
  }, [id]);

  const getInitials = (name) => {
    if (!name) return 'F';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join('');
  };

  // Extract weekly schedule entries
  const allEntries = React.useMemo(() => {
    if (!data?.weeklySchedule) return [];
    const list = [];
    Object.entries(data.weeklySchedule).forEach(([dayName, dayEntries]) => {
      (dayEntries || []).forEach((e) => {
        list.push({ ...e, day: dayName });
      });
    });
    return list;
  }, [data]);

  // Filter schedule by active day tab
  const displayedSchedule = React.useMemo(() => {
    if (activeDay === 'ALL') return allEntries;
    return allEntries.filter((e) => e.day === activeDay);
  }, [allEntries, activeDay]);

  if (loading) {
    return (
      <div className="dp-page-container">
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--dp-secondary)' }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: '0 auto 14px auto', color: 'var(--dp-primary)' }} />
          <h3 style={{ margin: 0, color: 'var(--dp-text)' }}>Loading faculty profile...</h3>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem' }}>Fetching teaching assignments and timetable</p>
        </div>
      </div>
    );
  }

  if (error || !data?.faculty) {
    return (
      <div className="dp-page-container">
        <button
          type="button"
          className="dp-btn dp-btn-outline dp-btn-sm"
          onClick={() => navigate('/dean/faculty')}
          style={{ marginBottom: '20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} />
          <span>Back to Faculty Directory</span>
        </button>

        <div className="dp-empty-card" style={{ background: 'var(--dp-card)', padding: '50px 20px', textAlign: 'center', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <AlertCircle size={40} style={{ color: 'var(--dp-danger)', margin: '0 auto 14px auto' }} />
          <h2 style={{ margin: '0 0 8px 0', color: 'var(--dp-text)' }}>Faculty Profile Unavailable</h2>
          <p style={{ margin: '0 0 20px 0', color: 'var(--dp-secondary)' }}>
            {error || 'The requested faculty record could not be found.'}
          </p>
          <button
            type="button"
            className="dp-btn dp-btn-primary dp-btn-sm"
            onClick={() => navigate('/dean/faculty')}
          >
            Return to Directory
          </button>
        </div>
      </div>
    );
  }

  const { faculty } = data;

  return (
    <div className="dp-page-container">
      {/* Navigation & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <button
          type="button"
          className="dp-btn dp-btn-outline dp-btn-sm"
          onClick={() => navigate('/dean/faculty')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}
          id="btn-back-to-directory"
        >
          <ArrowLeft size={16} />
          <span>Back to Faculty Directory</span>
        </button>

        <div style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)' }}>
          <Link to="/dean/faculty" style={{ color: 'var(--dp-secondary)', textDecoration: 'none' }}>
            Faculty Directory
          </Link>
          <span style={{ margin: '0 8px' }}>/</span>
          <span style={{ color: 'var(--dp-text)', fontWeight: 600 }}>{faculty.fullName}</span>
        </div>
      </div>

      {/* Hero Header Card */}
      <div
        style={{
          background: 'var(--dp-card)',
          border: '1px solid var(--dp-border)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '24px',
          marginBottom: '22px',
          boxShadow: 'var(--dp-shadow-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          flexWrap: 'wrap'
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 800,
            flexShrink: 0,
            boxShadow: '0 6px 16px rgba(124, 58, 237, 0.28)'
          }}
        >
          {getInitials(faculty.fullName)}
        </div>

        <div style={{ flex: 1, minWidth: '220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)' }}>
              {faculty.fullName}
            </h1>
            {faculty.facultyId && (
              <span className="dp-period-badge" style={{ fontWeight: 700 }}>
                ID: {faculty.facultyId}
              </span>
            )}
            <span
              className={`dp-status-badge ${faculty.status?.toLowerCase() === 'active' ? 'active' : 'inactive'}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span className={`dp-status-dot ${faculty.status?.toLowerCase() === 'active' ? 'green' : 'red'}`}></span>
              <span>{faculty.status || 'ACTIVE'}</span>
            </span>
          </div>

          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--dp-secondary)' }}>
            {faculty.designation || 'Faculty Member'} • Department of {faculty.department || 'Computer Science'}
          </p>
        </div>
      </div>

      {/* Overview & Contact Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '22px' }}>
        {/* Contact Information */}
        <div style={{ background: 'var(--dp-card)', border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-md)', padding: '20px', boxShadow: 'var(--dp-shadow-subtle)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Contact & Location
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.86rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--dp-muted)', display: 'block' }}>OFFICIAL EMAIL</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dp-text)', fontWeight: 500, marginTop: '2px' }}>
                <Mail size={15} style={{ color: 'var(--dp-primary)' }} />
                <span>{faculty.officialEmail || '—'}</span>
              </div>
            </div>

            {faculty.personalEmail && (
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--dp-muted)', display: 'block' }}>PERSONAL EMAIL</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dp-text)', marginTop: '2px' }}>
                  <Mail size={15} style={{ color: 'var(--dp-secondary)' }} />
                  <span>{faculty.personalEmail}</span>
                </div>
              </div>
            )}

            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--dp-muted)', display: 'block' }}>OFFICE / CABIN</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dp-text)', marginTop: '2px' }}>
                <Building size={15} style={{ color: 'var(--dp-secondary)' }} />
                <span>CS Faculty Block 2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teaching Metrics */}
        <div style={{ background: 'var(--dp-card)', border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-md)', padding: '20px', boxShadow: 'var(--dp-shadow-subtle)' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
            Workload & Teaching Stats
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--dp-surface)', padding: '12px', borderRadius: 'var(--dp-radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)', textTransform: 'uppercase' }}>Weekly Hours</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dp-primary)', marginTop: '2px' }}>
                {data.totalWeeklyHours || allEntries.length}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)' }}>Scheduled / Week</span>
            </div>

            <div style={{ background: 'var(--dp-surface)', padding: '12px', borderRadius: 'var(--dp-radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)', textTransform: 'uppercase' }}>Courses</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dp-text)', marginTop: '2px' }}>
                {faculty.assignedSubjects?.length || 0}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)' }}>Assigned Subjects</span>
            </div>

            <div style={{ background: 'var(--dp-surface)', padding: '12px', borderRadius: 'var(--dp-radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)', textTransform: 'uppercase' }}>Sections</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dp-text)', marginTop: '2px' }}>
                {faculty.assignedSections?.length || 0}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)' }}>Class Sections</span>
            </div>

            <div style={{ background: 'var(--dp-surface)', padding: '12px', borderRadius: 'var(--dp-radius-sm)' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)', textTransform: 'uppercase' }}>Venues</span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--dp-text)', marginTop: '2px' }}>
                {data.assignedRooms?.length || 0}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)' }}>Allocated Rooms</span>
            </div>
          </div>
        </div>
      </div>

      {/* Teaching Assignments Chips */}
      <div style={{ background: 'var(--dp-card)', border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-md)', padding: '20px', marginBottom: '22px', boxShadow: 'var(--dp-shadow-subtle)' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '14px' }}>
          Curriculum & Classroom Allocations
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Assigned Subjects */}
          <div>
            <strong style={{ fontSize: '0.8rem', color: 'var(--dp-text)', display: 'block', marginBottom: '8px' }}>
              Assigned Subjects ({faculty.assignedSubjects?.length || 0})
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {faculty.assignedSubjects && faculty.assignedSubjects.length > 0 ? (
                faculty.assignedSubjects.map((s) => (
                  <span
                    key={s._id || s.code}
                    className="dp-period-badge"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    <BookOpen size={13} style={{ marginRight: '5px' }} />
                    {s.name} {s.code ? `(${s.code})` : ''}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--dp-muted)' }}>No subjects assigned.</span>
              )}
            </div>
          </div>

          {/* Assigned Class Sections */}
          <div>
            <strong style={{ fontSize: '0.8rem', color: 'var(--dp-text)', display: 'block', marginBottom: '8px' }}>
              Assigned Class Sections ({faculty.assignedSections?.length || 0})
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {faculty.assignedSections && faculty.assignedSections.length > 0 ? (
                faculty.assignedSections.map((sec) => (
                  <span
                    key={sec._id || sec.name}
                    className="dp-status-badge active"
                    style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                  >
                    <Layers size={13} style={{ marginRight: '5px' }} />
                    {formatAcademicSection(sec.name)}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--dp-muted)' }}>No sections assigned.</span>
              )}
            </div>
          </div>

          {/* Allocated Rooms */}
          <div>
            <strong style={{ fontSize: '0.8rem', color: 'var(--dp-text)', display: 'block', marginBottom: '8px' }}>
              Allocated Rooms & Venues ({data.assignedRooms?.length || 0})
            </strong>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {data.assignedRooms && data.assignedRooms.length > 0 ? (
                data.assignedRooms.map((r) => (
                  <span
                    key={r}
                    className="dp-period-badge"
                    style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--dp-surface)' }}
                  >
                    <DoorOpen size={13} style={{ marginRight: '5px' }} />
                    Room {r}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '0.82rem', color: 'var(--dp-muted)' }}>No rooms allocated yet.</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Schedule Section */}
      <div style={{ background: 'var(--dp-card)', border: '1px solid var(--dp-border)', borderRadius: 'var(--dp-radius-md)', padding: '20px', boxShadow: 'var(--dp-shadow-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--dp-text)' }}>
              Weekly Timetable Schedule
            </h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--dp-secondary)' }}>
              Chronologically organized teaching sessions across all academic days.
            </p>
          </div>

          {/* Day Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`dp-quick-tag ${activeDay === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveDay('ALL')}
              style={{ borderRadius: '20px', fontSize: '0.8rem', padding: '5px 12px' }}
            >
              All Days ({allEntries.length})
            </button>
            {daysList.map((d) => {
              const count = (data.weeklySchedule?.[d] || []).length;
              return (
                <button
                  key={d}
                  type="button"
                  className={`dp-quick-tag ${activeDay === d ? 'active' : ''}`}
                  onClick={() => setActiveDay(d)}
                  style={{ borderRadius: '20px', fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  {d.slice(0, 3)} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedule Table */}
        {displayedSchedule.length > 0 ? (
          <div className="dp-table-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: 'var(--dp-surface)', borderBottom: '1px solid var(--dp-border)', color: 'var(--dp-secondary)' }}>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Day</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Period</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Time</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Subject</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Class / Section</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Venue</th>
                  <th style={{ padding: '12px 14px', fontWeight: 700 }}>Role</th>
                </tr>
              </thead>
              <tbody>
                {displayedSchedule.map((entry, idx) => (
                  <tr
                    key={entry._id || idx}
                    style={{ borderBottom: '1px solid var(--dp-border-light)' }}
                  >
                    <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--dp-text)' }}>
                      {entry.day}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span className="dp-period-badge">{entry.period || 'P1'}</span>
                    </td>

                    <td style={{ padding: '12px 14px', color: 'var(--dp-secondary)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Clock size={14} style={{ color: 'var(--dp-muted)' }} />
                        <span>{entry.timeFormatted || `${entry.startTime} - ${entry.endTime}`}</span>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} style={{ color: 'var(--dp-primary)', flexShrink: 0 }} />
                        <div>
                          <strong style={{ color: 'var(--dp-text)' }}>{entry.subject}</strong>
                          {entry.subjectCode && (
                            <span className="dp-code-chip" style={{ marginLeft: '6px' }}>
                              {entry.subjectCode}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--dp-text)' }}>
                        {formatAcademicSection(entry.section)}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <DoorOpen size={14} style={{ color: 'var(--dp-muted)', flexShrink: 0 }} />
                        <div>
                          <strong style={{ color: 'var(--dp-text)' }}>{entry.room}</strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)', marginLeft: '4px' }}>
                            ({entry.roomType || 'Classroom'})
                          </span>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {entry.isSubstituteTeacher ? (
                        <span className="dp-badge-substituted" style={{ fontSize: '0.72rem' }}>
                          SUBSTITUTE
                        </span>
                      ) : (
                        <span className="dp-status-badge active" style={{ fontSize: '0.72rem' }}>
                          PRIMARY
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--dp-secondary)' }}>
            <CheckCircle2 size={32} style={{ color: 'var(--dp-success)', margin: '0 auto 8px auto' }} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>
              No scheduled teaching sessions {activeDay !== 'ALL' ? `on ${activeDay}` : ''}.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeanFacultyDetailPage;
