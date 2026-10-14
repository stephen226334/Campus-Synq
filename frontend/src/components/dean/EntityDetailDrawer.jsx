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
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Building2
} from 'lucide-react';
import deanApi from '../../api/dean';
import { formatAcademicSection } from '../../utils/academicFormatter';
import { sortTimetableEntries, parseTimeToMinutes, formatPeriodTimeRange } from '../../utils/timetableSort';

export const EntityDetailDrawer = ({ entity, onClose, onModifySubstitution }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Normalize category and identifier
  const category = (entity?.category || entity?.entityType || entity?.type || 'ASSET').toUpperCase();
  const entityId = entity?.id || entity?._id || entity?.roomNumber || entity?.facultyId || entity?.code;

  useEffect(() => {
    if (!entity) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    const fetchEntityData = async () => {
      try {
        let res = null;
        const cat = category;

        if (cat === 'FACULTY' && entityId) {
          res = await deanApi.getFacultyDetails(entityId);
        } else if ((cat === 'SUBJECTS' || cat === 'SUBJECT') && entityId) {
          res = await deanApi.getSubjectDetails(entityId);
        } else if ((cat === 'CLASSROOMS' || cat === 'CLASSROOM') && entityId) {
          res = await deanApi.getClassroomDetails(entityId);
        } else if ((cat === 'LABS' || cat === 'LAB') && entityId) {
          res = await deanApi.getLabDetails(entityId);
        } else if ((cat === 'AUDITORIUMS' || cat === 'AUDITORIUM') && entityId) {
          res = await deanApi.getAuditoriumDetails(entityId);
        } else if ((cat === 'SEMESTERS' || cat === 'SEMESTER') && entityId) {
          res = await deanApi.getSemesterDetails(entityId);
        } else if ((cat === 'SECTIONS' || cat === 'SECTION') && entityId) {
          res = await deanApi.getSectionDetails(entityId);
        } else if ((cat === 'SUBSTITUTIONS' || cat === 'SUBSTITUTION') && entityId) {
          res = await deanApi.getSubstitutionById(entityId);
        } else {
          // If no remote ID endpoint match, use provided local details or raw object
          if (entity.details || entity.raw) {
            res = { data: entity.details || entity.raw };
          } else {
            throw new Error(`Unable to resolve details: missing identifier for ${cat}.`);
          }
        }

        if (isMounted) {
          setData(res?.data || entity.details || entity.raw || null);
        }
      } catch (err) {
        if (isMounted) {
          // Graceful fallback to local details if API call fails
          if (entity.details || entity.raw) {
            setData(entity.details || entity.raw);
          } else {
            setError(err.message || 'Unable to load asset details from server.');
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchEntityData();

    return () => {
      isMounted = false;
    };
  }, [entity, entityId, category, retryCount]);

  if (!entity) return null;

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  const getCategoryIcon = () => {
    switch (category) {
      case 'FACULTY': return <Users size={16} />;
      case 'SUBJECTS':
      case 'SUBJECT': return <BookOpen size={16} />;
      case 'CLASSROOMS':
      case 'CLASSROOM': return <DoorOpen size={16} />;
      case 'LABS':
      case 'LAB': return <Cpu size={16} />;
      case 'AUDITORIUMS':
      case 'AUDITORIUM': return <Tv size={16} />;
      case 'SEMESTERS':
      case 'SEMESTER': return <GraduationCap size={16} />;
      case 'SECTIONS':
      case 'SECTION': return <Layers size={16} />;
      case 'SUBSTITUTIONS':
      case 'SUBSTITUTION': return <ArrowRightLeft size={16} />;
      default: return <Calendar size={16} />;
    }
  };

  const getInitials = (name) => {
    if (!name) return 'CS';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  };

  // Helper to flatten weekly schedule dictionary into an ordered array
  const getFlattenedSchedule = (weeklySchedule) => {
    if (!weeklySchedule) return [];
    if (Array.isArray(weeklySchedule)) return sortTimetableEntries(weeklySchedule);
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const flat = [];
    daysOrder.forEach((day) => {
      const classes = weeklySchedule[day] || [];
      const sortedClasses = [...classes].sort((a, b) => {
        const startA = parseTimeToMinutes(a.startTime || a.period?.startTime);
        const startB = parseTimeToMinutes(b.startTime || b.period?.startTime);
        return startA - startB;
      });
      sortedClasses.forEach((cls) => {
        flat.push({
          ...cls,
          day
        });
      });
    });
    return flat;
  };

  return (
    <div className="dp-drawer-backdrop" onClick={onClose} aria-modal="true" role="dialog">
      <div className="dp-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="dp-drawer-header">
          <div className="dp-drawer-header-left">
            <span className="dp-badge-portal" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              {getCategoryIcon()}
              <span>{category}</span>
            </span>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: '2px 0 0 0', color: 'var(--dp-text)' }}>
              {entity.title || (data?.classroom ? `Room ${data.classroom.roomNumber}` : 'Asset Details')}
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

        {/* Drawer Body */}
        <div className="dp-drawer-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--dp-secondary)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
              <p style={{ fontSize: '0.9rem', margin: 0 }}>Inspecting academic asset details...</p>
            </div>
          ) : error ? (
            <div className="dp-form-alert error" style={{ margin: '20px 0', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={18} style={{ color: 'var(--dp-danger)' }} />
                <span style={{ fontWeight: 600 }}>{error}</span>
              </div>
              <button
                type="button"
                className="dp-btn dp-btn-primary dp-btn-sm"
                onClick={handleRetry}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} />
                <span>Retry</span>
              </button>
            </div>
          ) : data ? (
            <>
              {/* ============================================================ */}
              {/* RENDER CATEGORY: CLASSROOM */}
              {/* ============================================================ */}
              {(category === 'CLASSROOMS' || category === 'CLASSROOM') && (
                <div>
                  {/* Classroom Specifications Card */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Classroom Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Room Number</div>
                        <div className="dp-info-cell-value">{data.classroom?.roomNumber || data.roomNumber || entityId}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Room Type</div>
                        <div className="dp-info-cell-value">{data.roomType || data.classroom?.roomType || 'Classroom / Lecture Hall'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.classroom?.capacity || data.capacity || 60} Seats</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value">
                          <span className="dp-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <span className="dp-status-dot green"></span>
                            <span>{data.classroom?.status || data.status || 'ACTIVE'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="dp-info-cell-label">Location / Building</div>
                        <div className="dp-info-cell-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} style={{ color: 'var(--dp-primary)' }} />
                          <span>{data.classroom?.floor || data.floor || 'Level 2 · Main Academic Block'}</span>
                        </div>
                      </div>
                      <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="dp-info-cell-label">Total Assigned Sessions</div>
                        <div className="dp-info-cell-value">{data.assignedSessionsCount || data.weeklySchedule?.length || 0} Sessions / Week</div>
                      </div>
                    </div>
                  </div>

                  {/* Contextual Inspection Card (if opened from Class Search or Current Status) */}
                  {(entity.details?.period || entity.details?.subject || entity.details?.className) && (
                    <div className="dp-drawer-section">
                      <div className="dp-drawer-section-title">Inspected Session Context</div>
                      <div style={{ background: 'var(--dp-surface)', padding: '14px', borderRadius: '8px', border: '1px solid var(--dp-border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            {entity.details.day && <span className="dp-period-badge">{entity.details.day}</span>}
                            {entity.details.period && <span className="dp-period-badge">{entity.details.period}</span>}
                          </div>
                          {entity.details.status && (
                            <span className={`dp-status-badge ${entity.details.status.toLowerCase()}`}>
                              {entity.details.status}
                            </span>
                          )}
                        </div>
                        {entity.details.time && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--dp-secondary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Clock size={13} />
                            <span>{entity.details.time}</span>
                          </div>
                        )}
                        {entity.details.subject && (
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--dp-text)', marginBottom: '4px' }}>
                            {entity.details.subject} {entity.details.subjectCode ? `(${entity.details.subjectCode})` : ''}
                          </div>
                        )}
                        {entity.details.className && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--dp-secondary)' }}>
                            Section: <strong>{formatAcademicSection(entity.details.className)}</strong>
                          </div>
                        )}
                        {entity.details.faculty && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--dp-primary)', marginTop: '4px' }}>
                            Faculty: {entity.details.faculty}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weekly Sessions in this Classroom */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">
                      Weekly Schedule ({data.weeklySchedule?.length || 0} Sessions)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {data.weeklySchedule && data.weeklySchedule.length > 0 ? (
                        sortTimetableEntries(data.weeklySchedule).map((s) => (
                          <div
                            key={s._id}
                            style={{
                              padding: '10px 12px',
                              background: 'var(--dp-surface)',
                              border: '1px solid var(--dp-border)',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.85rem'
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                                <span className="dp-period-badge">{s.day}</span>
                                {s.period?.periodNumber && (
                                  <span className="dp-period-badge">{s.period.periodNumber}</span>
                                )}
                                <span style={{ fontWeight: 600, color: 'var(--dp-text)' }}>
                                  {s.subject?.name || 'Class Session'}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)' }}>
                                Section: {s.section?.name || 'General'}
                                {s.subject?.code ? ` • Code: ${s.subject.code}` : ''}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--dp-primary)' }}>
                                {s.faculty?.fullName || 'Assigned Faculty'}
                              </div>
                              {s.period?.startTime && (
                                <div style={{ fontSize: '0.76rem', color: 'var(--dp-secondary)', marginTop: '2px' }}>
                                  {s.period.startTime} - {s.period.endTime}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="dp-empty-state-cell" style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--dp-surface)', borderRadius: '8px', color: 'var(--dp-secondary)', fontSize: '0.85rem' }}>
                          No active weekly timetable sessions scheduled for Room {data.classroom?.roomNumber || entityId}.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: FACULTY (PHASE 4 REDESIGN) */}
              {/* ============================================================ */}
              {category === 'FACULTY' && (
                <div>
                  {/* Faculty Profile Hero Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: 'var(--dp-surface)',
                    border: '1px solid var(--dp-border)',
                    borderRadius: '10px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
                    }}>
                      {getInitials(data.faculty?.fullName || entity.title)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{ margin: '0 0 3px 0', fontSize: '1.15rem', fontWeight: 600, color: 'var(--dp-text)', wordBreak: 'break-word' }}>
                        {data.faculty?.fullName || entity.title}
                      </h4>
                      <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--dp-secondary)' }}>
                        {data.faculty?.designation || 'Faculty Member'} • {data.faculty?.department || 'Computer Science'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {data.faculty?.facultyId && (
                          <span className="dp-period-badge" style={{ fontSize: '0.75rem' }}>
                            ID: {data.faculty.facultyId}
                          </span>
                        )}
                        <span className="dp-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                          <span className="dp-status-dot green"></span>
                          <span>{data.faculty?.status || 'ACTIVE'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Section: Faculty Information */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Faculty Information</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                        <div className="dp-info-cell-label">Official CampusSynq Email</div>
                        <div className="dp-info-cell-value" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Mail size={14} style={{ color: 'var(--dp-primary)' }} />
                          <span>{data.faculty?.officialEmail || '—'}</span>
                        </div>
                      </div>
                      {data.faculty?.personalEmail && (
                        <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                          <div className="dp-info-cell-label">Personal Email</div>
                          <div className="dp-info-cell-value" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Mail size={14} style={{ color: 'var(--dp-secondary)' }} />
                            <span>{data.faculty.personalEmail}</span>
                          </div>
                        </div>
                      )}
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Office / Cabin</div>
                        <div className="dp-info-cell-value">CS Faculty Block 2</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Total Scheduled Hours</div>
                        <div className="dp-info-cell-value">
                          {data.totalWeeklyHours || data.faculty?.weeklySessionsCount || (data.weeklySchedule ? Object.values(data.weeklySchedule).flat().length : 0)} Hours / Week
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Teaching Assignments */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Teaching Assignments</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Assigned Subjects
                        </strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {data.faculty?.assignedSubjects && data.faculty.assignedSubjects.length > 0 ? (
                            data.faculty.assignedSubjects.map((s) => (
                              <span key={s._id || s.code} className="dp-period-badge" style={{ padding: '4px 8px' }}>
                                {s.name} {s.code ? `(${s.code})` : ''}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None assigned</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Assigned Sections
                        </strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {data.faculty?.assignedSections && data.faculty.assignedSections.length > 0 ? (
                            data.faculty.assignedSections.map((sec) => (
                              <span key={sec._id || sec.name} className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-text)', padding: '4px 8px' }}>
                                {sec.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None assigned</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <strong style={{ fontSize: '0.78rem', color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Assigned Rooms & Labs
                        </strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                          {data.assignedRooms && data.assignedRooms.length > 0 ? (
                            data.assignedRooms.map((r) => (
                              <span key={r} className="dp-period-badge" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)', padding: '4px 8px' }}>
                                {r}
                              </span>
                            ))
                          ) : (
                            <span style={{ color: 'var(--dp-muted)', fontSize: '0.82rem' }}>None recorded</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section: Weekly Schedule Table (Phase 4 Redesign) */}
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">
                      Weekly Schedule ({data.totalWeeklyHours || (data.weeklySchedule ? Object.values(data.weeklySchedule).flat().length : 0)} Sessions)
                    </div>

                    {(() => {
                      const scheduleRows = getFlattenedSchedule(data.weeklySchedule);
                      if (scheduleRows.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--dp-surface)', borderRadius: '8px', color: 'var(--dp-secondary)', fontSize: '0.85rem' }}>
                            No scheduled classes recorded for this faculty member.
                          </div>
                        );
                      }

                      return (
                        <div className="dp-table-container" style={{ borderRadius: '8px', border: '1px solid var(--dp-border)' }}>
                          <table className="dp-table" style={{ fontSize: '0.82rem' }}>
                            <thead>
                              <tr>
                                <th>DAY</th>
                                <th>PERIOD</th>
                                <th>TIME</th>
                                <th>SUBJECT</th>
                                <th>CLASS / SECTION</th>
                                <th>ROOM</th>
                              </tr>
                            </thead>
                            <tbody>
                              {scheduleRows.map((slot, idx) => (
                                <tr key={slot._id || idx}>
                                  <td style={{ fontWeight: 600 }}>{slot.day}</td>
                                  <td>
                                    <span className="dp-period-badge">{slot.period || `P${idx + 1}`}</span>
                                  </td>
                                  <td style={{ whiteSpace: 'nowrap', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                                    {slot.timeFormatted || (slot.startTime ? `${slot.startTime} - ${slot.endTime}` : '—')}
                                  </td>
                                  <td style={{ fontWeight: 600 }}>
                                    <div>{slot.subject || '—'}</div>
                                    {slot.subjectCode && (
                                      <span style={{ fontSize: '0.74rem', color: 'var(--dp-secondary)' }}>{slot.subjectCode}</span>
                                    )}
                                  </td>
                                  <td>{formatAcademicSection(slot.section || '—')}</td>
                                  <td>
                                    <span className="dp-status-badge live" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)' }}>
                                      {slot.room || '—'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: LAB */}
              {/* ============================================================ */}
              {(category === 'LABS' || category === 'LAB') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Lab Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Lab Number</div>
                        <div className="dp-info-cell-value">{data.lab?.labNumber || data.labNumber || entityId}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Lab Name</div>
                        <div className="dp-info-cell-value">{data.lab?.labName || data.name || 'Computer Science Lab'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.lab?.capacity || data.capacity || 35} Workstations</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.lab?.status || data.status || 'ACTIVE'}
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
                      )) || <div style={{ color: 'var(--dp-muted)', fontSize: '0.85rem' }}>No sessions assigned</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: AUDITORIUM */}
              {/* ============================================================ */}
              {(category === 'AUDITORIUMS' || category === 'AUDITORIUM') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Auditorium Specifications</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Auditorium Number</div>
                        <div className="dp-info-cell-value">{data.auditorium?.auditoriumNumber || data.auditoriumNumber || entityId}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Name</div>
                        <div className="dp-info-cell-value">{data.auditorium?.name || data.name || 'Main Hall'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Capacity</div>
                        <div className="dp-info-cell-value">{data.auditorium?.capacity || data.capacity || 250} Seats</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.auditorium?.status || data.status || 'ACTIVE'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: SUBJECT */}
              {/* ============================================================ */}
              {(category === 'SUBJECTS' || category === 'SUBJECT') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Subject Information</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Subject Code</div>
                        <div className="dp-info-cell-value">{data.subject?.code || data.code || entityId}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Credits</div>
                        <div className="dp-info-cell-value">{data.subject?.credits || data.credits || 4}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Type</div>
                        <div className="dp-info-cell-value">{data.subject?.type || data.type || 'Theory'}</div>
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

              {/* ============================================================ */}
              {/* RENDER CATEGORY: SECTION */}
              {/* ============================================================ */}
              {(category === 'SECTIONS' || category === 'SECTION') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Class Section Details</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Section Name</div>
                        <div className="dp-info-cell-value">{data.section?.name || data.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Semester</div>
                        <div className="dp-info-cell-value">{data.section?.semester?.name || 'Computer Science'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Student Capacity</div>
                        <div className="dp-info-cell-value">{data.section?.capacity || data.capacity || 60} Students</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Status</div>
                        <div className="dp-info-cell-value" style={{ color: 'var(--dp-success)' }}>
                          {data.section?.status || data.status || 'ACTIVE'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: SEMESTER */}
              {/* ============================================================ */}
              {(category === 'SEMESTERS' || category === 'SEMESTER') && (
                <div>
                  <div className="dp-drawer-section">
                    <div className="dp-drawer-section-title">Semester Overview</div>
                    <div className="dp-info-grid">
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Semester Name</div>
                        <div className="dp-info-cell-value">{data.semester?.name || data.name}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Academic Year</div>
                        <div className="dp-info-cell-value">{data.semester?.academicYear || data.academicYear || '2026'}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Sections Count</div>
                        <div className="dp-info-cell-value">{data.sections?.length || data.sectionsCount || 0}</div>
                      </div>
                      <div className="dp-info-cell">
                        <div className="dp-info-cell-label">Subjects Count</div>
                        <div className="dp-info-cell-value">{data.subjects?.length || data.subjectsCount || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* RENDER CATEGORY: SUBSTITUTION */}
              {/* ============================================================ */}
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
