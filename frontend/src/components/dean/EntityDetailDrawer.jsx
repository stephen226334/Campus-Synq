import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  BookOpen,
  DoorOpen,
  Cpu,
  Tv,
  GraduationCap,
  Layers,
  Calendar,
  Clock,
  MapPin,
  Mail,
  Phone,
  ShieldCheck,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import deanApi from '../../api/dean';

export const EntityDetailDrawer = ({ entity, onClose, onModifySubstitution }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!entity || !entity.id || !entity.category) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchEntityData = async () => {
      try {
        let res;
        const cat = entity.category.toUpperCase();

        if (cat === 'FACULTY') {
          res = await deanApi.getFacultyDetails(entity.id);
        } else if (cat === 'SUBJECTS' || cat === 'SUBJECT') {
          res = await deanApi.getSubjectDetails(entity.id);
        } else if (cat === 'CLASSROOMS' || cat === 'CLASSROOM') {
          res = await deanApi.getClassroomDetails(entity.id);
        } else if (cat === 'LABS' || cat === 'LAB') {
          res = await deanApi.getLabDetails(entity.id);
        } else if (cat === 'AUDITORIUMS' || cat === 'AUDITORIUM') {
          res = await deanApi.getAuditoriumDetails(entity.id);
        } else if (cat === 'SEMESTERS' || cat === 'SEMESTER') {
          res = await deanApi.getSemesterDetails(entity.id);
        } else if (cat === 'SECTIONS' || cat === 'SECTION') {
          res = await deanApi.getSectionDetails(entity.id);
        } else if (cat === 'SUBSTITUTIONS' || cat === 'SUBSTITUTION') {
          res = await deanApi.getSubstitutionById(entity.id);
        } else {
          res = { data: entity.raw || entity };
        }

        if (isMounted) {
          setData(res?.data || null);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load details.');
          setLoading(false);
        }
      }
    };

    fetchEntityData();

    return () => {
      isMounted = false;
    };
  }, [entity]);

  if (!entity) return null;

  const category = (entity.category || 'ASSET').toUpperCase();

  const getCategoryIcon = () => {
    switch (category) {
      case 'FACULTY': return <Users size={18} />;
      case 'SUBJECTS':
      case 'SUBJECT': return <BookOpen size={18} />;
      case 'CLASSROOMS':
      case 'CLASSROOM': return <DoorOpen size={18} />;
      case 'LABS':
      case 'LAB': return <Cpu size={18} />;
      case 'AUDITORIUMS':
      case 'AUDITORIUM': return <Tv size={18} />;
      case 'SEMESTERS':
      case 'SEMESTER': return <GraduationCap size={18} />;
      case 'SECTIONS':
      case 'SECTION': return <Layers size={18} />;
      case 'SUBSTITUTIONS':
      case 'SUBSTITUTION': return <ArrowRightLeft size={18} />;
      default: return <Calendar size={18} />;
    }
  };

  return (
    <div className="dp-drawer-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="dp-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="dp-drawer-header">
          <div className="dp-drawer-header-left">
            <span className="dp-badge-portal" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              {getCategoryIcon()}
              <span>{category}</span>
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--dp-text)' }}>
              {entity.title || 'Asset Details'}
            </h3>
          </div>
          <button
            type="button"
            className="dp-drawer-close-btn"
            onClick={onClose}
            aria-label="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="dp-drawer-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dp-secondary)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
              <p style={{ fontSize: '0.9rem' }}>Inspecting academic asset details...</p>
            </div>
          ) : error ? (
            <div className="dp-form-alert error">
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* RENDER CATEGORY: FACULTY */}
              {category === 'FACULTY' && (
                <div>
                  {/* Basic Profile */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Faculty Profile</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Faculty Name</div>
                        <div className="dp-info-cell-value">{data.faculty?.fullName}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Faculty ID</div>
                        <div className="dp-info-cell-value">{data.faculty?.facultyId}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Designation</div>
                        <div className="dp-info-cell-value">{data.faculty?.designation}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.faculty?.status}
                        </div>
                      </div>
                      <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="dp-info-cell-label">Official CampusSynq Email</div>
                        <div className="dp-info-cell-value" style={{ fontSize: '0.85rem' }}>
                          {data.faculty?.officialEmail}
                        </div>
                      </div>
                      {data.faculty?.personalEmail && (
                        <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                          <div className="dp-info-cell-label">Personal Email</div>
                          <div className="dp-info-cell-value" style={{ fontSize: '0.85rem' }}>
                            {data.faculty?.personalEmail}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Assigned Subjects & Sections */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Assigned Curriculum & Rooms</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>ASSIGNED SUBJECTS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.faculty?.assignedSubjects?.map((s) => (
                            <span key={s._id} className="dp-period-badge">
                              {s.name} ({s.code})
                            </span>
                          )) || <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None</span>}
                        </div>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>ASSIGNED SECTIONS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.faculty?.assignedSections?.map((sec) => (
                            <span key={sec._id} className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-text)' }}>
                              {sec.name}
                            </span>
                          )) || <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None</span>}
                        </div>
                      </div>
                      <div style={{ marginTop: '6px' }}>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>ASSIGNED ROOMS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.assignedRooms?.map((r) => (
                            <span key={r} className="dp-period-badge" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)' }}>
                              {r}
                            </span>
                          )) || <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Weekly Timetable Schedule */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">
                      Weekly Timetable ({data.totalWeeklyHours || 0} Hours)
                    </div>
                    {data.weeklySchedule && Object.entries(data.weeklySchedule).map(([day, classes]) => (
                      classes.length > 0 && (
                        <div key={day} className="dp-drawer-day-card">
                          <div className="dp-drawer-day-title">{day.toUpperCase()}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {classes.map((cls) => (
                              <div
                                key={cls._id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  fontSize: '0.82rem',
                                  padding: '6px 8px',
                                  background: 'var(--dp-surface)',
                                  borderRadius: '6px'
                                }}
                              >
                                <div>
                                  <span className="dp-period-badge" style={{ marginRight: '6px' }}>{cls.period}</span>
                                  <span style={{ fontWeight: 600 }}>{cls.subject}</span>
                                  <span style={{ color: 'var(--dp-secondary)', marginLeft: '6px' }}>({cls.section})</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: 'var(--dp-secondary)' }}>
                                    {cls.timeFormatted}
                                  </span>
                                  <span className="dp-status-badge live" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)' }}>
                                    {cls.room}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: SUBJECT */}
              {(category === 'SUBJECTS' || category === 'SUBJECT') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Subject Information</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Subject Code</div>
                        <div className="dp-info-cell-value">{data.subject?.code}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Credits</div>
                        <div className="dp-info-cell-value">{data.subject?.credits || 4}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Type</div>
                        <div className="dp-info-cell-value">{data.subject?.type || 'Theory'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Semester</div>
                        <div className="dp-info-cell-value">{data.subject?.semester?.name || 'Computer Science'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Assigned Classes & Rooms</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>ASSIGNED FACULTY:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.assignedFaculty?.map((f, i) => (
                            <span key={i} className="dp-period-badge">
                              {typeof f === 'object' ? f.fullName : f}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>SECTIONS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.sections?.map((sec, i) => (
                            <span key={i} className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-text)' }}>
                              {sec}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>ROOMS & LABS:</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {data.rooms?.map((r, i) => (
                            <span key={i} className="dp-period-badge" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)' }}>
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: CLASSROOM */}
              {(category === 'CLASSROOMS' || category === 'CLASSROOM') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Classroom Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Room Number</div>
                        <div className="dp-info-cell-value">{data.classroom?.roomNumber}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.classroom?.capacity} Students</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.classroom?.status}
                        </div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Total Assigned Sessions</div>
                        <div className="dp-info-cell-value">{data.assignedSessionsCount || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Weekly Sessions in Room {data.classroom?.roomNumber}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {data.weeklySchedule?.map((s) => (
                        <div
                          key={s._id}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--dp-surface)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <span className="dp-period-badge" style={{ marginRight: '6px' }}>{s.day}</span>
                            <strong>{s.subject?.name}</strong>
                            <span style={{ color: 'var(--dp-secondary)', marginLeft: '6px' }}>({s.section?.name})</span>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>
                            {s.faculty?.fullName}
                          </span>
                        </div>
                      )) || <div style={{ color: 'var(--dp-muted)', fontSize: '0.85rem' }}>No sessions assigned</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: LAB */}
              {(category === 'LABS' || category === 'LAB') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Lab Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Lab Number</div>
                        <div className="dp-info-cell-value">{data.lab?.labNumber}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Lab Name</div>
                        <div className="dp-info-cell-value">{data.lab?.labName}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.lab?.capacity} Workstations</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.lab?.status}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Associated Subjects & Sessions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                      {data.associatedSubjects?.map((sub, i) => (
                        <span key={i} className="dp-period-badge">{sub}</span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {data.weeklySchedule?.map((s) => (
                        <div
                          key={s._id}
                          style={{
                            padding: '8px 12px',
                            background: 'var(--dp-surface)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '0.85rem'
                          }}
                        >
                          <div>
                            <span className="dp-period-badge" style={{ marginRight: '6px' }}>{s.day} {s.period?.periodNumber}</span>
                            <strong>{s.subject?.name}</strong>
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)' }}>
                            {s.faculty?.fullName} • {s.section?.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: AUDITORIUM */}
              {(category === 'AUDITORIUMS' || category === 'AUDITORIUM') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Auditorium Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Number</div>
                        <div className="dp-info-cell-value">{data.auditorium?.auditoriumNumber}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Name</div>
                        <div className="dp-info-cell-value">{data.auditorium?.auditoriumName}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.auditorium?.capacity} Seats</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.auditorium?.status}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: SEMESTER */}
              {(category === 'SEMESTERS' || category === 'SEMESTER') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Semester Curriculum Overview</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Semester</div>
                        <div className="dp-info-cell-value">{data.semester?.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Academic Year</div>
                        <div className="dp-info-cell-value">{data.semester?.academicYear}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Total Sections</div>
                        <div className="dp-info-cell-value">{data.sections?.length || 0}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Total Subjects</div>
                        <div className="dp-info-cell-value">{data.subjects?.length || 0}</div>
                      </div>
                    </div>
                  </div>

                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Active Subjects</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {data.subjects?.map((s) => (
                        <span key={s._id} className="dp-period-badge">
                          {s.name} ({s.code})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: SECTION */}
              {(category === 'SECTIONS' || category === 'SECTION') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Class Section Details</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Section Name</div>
                        <div className="dp-info-cell-value">{data.section?.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Semester</div>
                        <div className="dp-info-cell-value">{data.section?.semester?.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Student Capacity</div>
                        <div className="dp-info-cell-value">{data.section?.capacity || 60}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.section?.status || 'ACTIVE'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RENDER CATEGORY: SUBSTITUTION */}
              {(category === 'SUBSTITUTIONS' || category === 'SUBSTITUTION') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Substitution Details</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Date</div>
                        <div className="dp-info-cell-value">{data.date}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value">
                          <span className={`dp-status-badge ${data.status?.toLowerCase()}`}>
                            {data.status}
                          </span>
                        </div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Original Faculty</div>
                        <div className="dp-info-cell-value">{data.originalFaculty?.fullName}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Substitute Faculty</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-primary)' }}>
                          {data.substituteFaculty?.fullName}
                        </div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Subject</div>
                        <div className="dp-info-cell-value">{data.subject?.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Room</div>
                        <div className="dp-info-cell-value">{data.roomDetails?.roomNumber}</div>
                      </div>
                      <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="dp-info-cell-label">Reason</div>
                        <div className="dp-info-cell-value" style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                          {data.reason}
                        </div>
                      </div>
                    </div>
                  </div>

                  {onModifySubstitution && (
                    <div style={{ marginTop: '20px' }}>
                      <button
                        type="button"
                        className="dp-btn dp-btn-primary"
                        style={{ width: '100%' }}
                        onClick={() => {
                          onClose();
                          onModifySubstitution(data);
                        }}
                      >
                        <ArrowRightLeft size={16} />
                        <span>Modify This Substitution</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default EntityDetailDrawer;
