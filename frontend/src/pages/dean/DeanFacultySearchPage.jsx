import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  Users, 
  Search, 
  Calendar, 
  Clock, 
  BookOpen, 
  DoorOpen, 
  Layers, 
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Mail,
  Building,
  CheckCircle2
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import { parseTimeToMinutes, DAY_INDEX } from '../../utils/timetableSort';
import SearchableDropdown from '../../components/common/SearchableDropdown';

export const DeanFacultySearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();

  const [facultyList, setFacultyList] = useState([]);
  const [loadingFacultyList, setLoadingFacultyList] = useState(true);
  const [facultyListError, setFacultyListError] = useState(null);

  const initialFacultyParam = searchParams.get('faculty') || '';
  const initialDayParam = searchParams.get('day') || '';

  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [dayFilter, setDayFilter] = useState(initialDayParam);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { showToast } = useToast();

  // 1. Fetch live faculty records from database
  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoadingFacultyList(true);
        setFacultyListError(null);
        const res = await deanApi.getFacultyList();
        const list = res.data || [];
        setFacultyList(list);

        if (list.length > 0) {
          let matched = null;
          if (initialFacultyParam) {
            matched = list.find(
              (f) =>
                f._id === initialFacultyParam ||
                f.fullName.toLowerCase().includes(initialFacultyParam.toLowerCase()) ||
                f.facultyId?.toLowerCase() === initialFacultyParam.toLowerCase()
            );
          }
          const defaultFaculty = matched || list[0];
          setSelectedFacultyId(defaultFaculty._id);
        }
      } catch (err) {
        console.error('Failed to load faculty list:', err);
        setFacultyListError('Unable to load faculty records from server');
      } finally {
        setLoadingFacultyList(false);
      }
    };

    fetchFaculty();
  }, []);

  // Format faculty options for SearchableDropdown
  const facultyOptions = React.useMemo(() => {
    return facultyList.map((f) => ({
      value: f._id,
      label: f.fullName,
      subLabel: `${f.designation || 'Faculty'} • ID: ${f.facultyId || '—'} • ${f.department || 'Computer Science'}`,
      badge: f.facultyId ? `ID: ${f.facultyId}` : (f.status || 'ACTIVE'),
      searchTerms: `${f.fullName} ${f.facultyId || ''} ${f.officialEmail || ''} ${f.designation || ''}`,
      raw: f
    }));
  }, [facultyList]);

  // Execute faculty schedule retrieval
  const executeSearch = async (targetFacultyId = selectedFacultyId, targetDay = dayFilter) => {
    if (!targetFacultyId) return;

    try {
      setLoading(true);
      setSearched(true);

      const res = await deanApi.getFacultyWiseSearch({
        faculty: targetFacultyId,
        day: targetDay
      });

      if (res?.data && Array.isArray(res.data.schedule)) {
        res.data.schedule.sort((a, b) => {
          const dayA = DAY_INDEX[a.day] !== undefined ? DAY_INDEX[a.day] : 999;
          const dayB = DAY_INDEX[b.day] !== undefined ? DAY_INDEX[b.day] : 999;
          if (dayA !== dayB) return dayA - dayB;
          const startA = parseTimeToMinutes(a.time ? a.time.split('-')[0].trim() : '');
          const startB = parseTimeToMinutes(b.time ? b.time.split('-')[0].trim() : '');
          return startA - startB;
        });
      }

      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to retrieve faculty timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run search when default faculty is selected
  useEffect(() => {
    if (selectedFacultyId && !searched) {
      executeSearch(selectedFacultyId, dayFilter);
    }
  }, [selectedFacultyId]);

  // React to URL search param updates while mounted
  useEffect(() => {
    const urlFaculty = searchParams.get('faculty');
    const urlDay = searchParams.get('day');

    if (urlDay && urlDay !== dayFilter) setDayFilter(urlDay);

    if (urlFaculty && facultyList.length > 0) {
      const matched = facultyList.find(
        (f) =>
          f._id === urlFaculty ||
          f.fullName.toLowerCase().includes(urlFaculty.toLowerCase()) ||
          f.facultyId?.toLowerCase() === urlFaculty.toLowerCase()
      );
      if (matched && matched._id !== selectedFacultyId) {
        setSelectedFacultyId(matched._id);
        executeSearch(matched._id, urlDay || dayFilter);
      }
    }
  }, [searchParams, facultyList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedFacultyId) {
      showToast('Please select a faculty member', 'warning');
      return;
    }
    setSearchParams({
      faculty: selectedFacultyId,
      ...(dayFilter ? { day: dayFilter } : {})
    });
    executeSearch();
  };

  const selectedFacultyDoc = facultyList.find((f) => f._id === selectedFacultyId);

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <Users size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Faculty Search</h1>
            <p className="dp-page-subtitle">
              Inspect any faculty member's profile, live teaching status, and weekly timetable.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-faculty-search-grid">
          {/* 1. Dynamic Faculty Dropdown */}
          <div className="dp-form-field">
            <SearchableDropdown
              id="search-faculty-dropdown"
              label="Faculty Member"
              options={facultyOptions}
              value={selectedFacultyId}
              onChange={(val) => {
                setSelectedFacultyId(val);
                if (val) executeSearch(val, dayFilter);
              }}
              placeholder="Search by faculty name or ID..."
              loading={loadingFacultyList}
              loadingText="Loading faculty records..."
              error={facultyListError}
              icon={Users}
              required
            />
          </div>

          {/* 2. Optional Day Filter */}
          <div className="dp-form-field">
            <label className="dp-form-label" htmlFor="faculty-day-filter">Day Filter (Optional)</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={16} className="dp-form-icon" />
              <select
                id="faculty-day-filter"
                value={dayFilter}
                onChange={(e) => {
                  setDayFilter(e.target.value);
                }}
              >
                <option value="">All Days (Weekly Schedule)</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
          </div>

          {/* 3. Search Action */}
          <div className="dp-form-field dp-form-actions">
            <label className="dp-form-label dp-label-spacer">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-primary"
              disabled={loading || loadingFacultyList}
              id="btn-search-faculty"
            >
              <Search size={16} />
              <span>{loading ? 'Searching...' : 'Search Faculty'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Container */}
      <div className="dp-results-container">
        {loading ? (
          <div className="dp-loading-card">
            <div className="dp-skeleton-line" style={{ width: '40%', height: '24px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '80%', height: '16px', marginTop: '12px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '60%', height: '16px', marginTop: '8px' }}></div>
          </div>
        ) : data && data.faculty ? (
          <div>
            {/* Faculty Info & Live Status Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {/* Faculty Profile Card */}
              <div
                style={{
                  background: 'var(--dp-card)',
                  border: '1px solid var(--dp-border)',
                  borderRadius: 'var(--dp-radius-md)',
                  padding: '20px',
                  boxShadow: 'var(--dp-shadow-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="dp-period-badge">
                    ID: {data.faculty.facultyId || selectedFacultyDoc?.facultyId || 'FAC'}
                  </span>
                  <span className="dp-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span className="dp-status-dot green"></span>
                    <span>{data.faculty.status || 'ACTIVE'}</span>
                  </span>
                </div>

                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {data.faculty.fullName}
                </h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--dp-secondary)', margin: '0 0 14px 0' }}>
                  {data.faculty.designation || 'Faculty Member'} • {data.faculty.department || 'Computer Science'}
                </p>

                <div style={{ fontSize: '0.82rem', color: 'var(--dp-text)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} style={{ color: 'var(--dp-primary)' }} />
                    <span>{data.faculty.officialEmail || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} style={{ color: 'var(--dp-secondary)' }} />
                    <span>{data.faculty.assignedSubjects?.length || 0} Assigned Subjects</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--dp-secondary)' }} />
                    <span>{data.faculty.assignedSections?.length || 0} Assigned Class Sections</span>
                  </div>
                </div>
              </div>

              {/* Live Academic Status Card */}
              <div
                style={{
                  background: 'var(--dp-card)',
                  border: '1px solid var(--dp-border)',
                  borderRadius: 'var(--dp-radius-md)',
                  padding: '20px',
                  boxShadow: 'var(--dp-shadow-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Current Live Status
                    </span>
                    <span
                      className={`dp-status-badge ${data.currentStatus === 'FREE' ? 'active' : 'in-class'}`}
                      style={{
                        background: data.currentStatus === 'FREE' ? 'var(--dp-success-soft)' : 'var(--dp-danger-soft)',
                        color: data.currentStatus === 'FREE' ? 'var(--dp-success)' : 'var(--dp-danger)',
                        border: `1px solid ${data.currentStatus === 'FREE' ? 'var(--dp-success)' : 'var(--dp-danger)'}`,
                        fontWeight: 700
                      }}
                    >
                      {data.currentStatusBadge || data.currentStatus || 'FREE'}
                    </span>
                  </div>

                  {data.currentDetails ? (
                    <div style={{ background: 'var(--dp-surface)', padding: '12px', borderRadius: 'var(--dp-radius-sm)', marginBottom: '10px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--dp-text)', marginBottom: '4px' }}>
                        {data.currentDetails.subject}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)' }}>
                        Section: {data.currentDetails.className} • Room: {data.currentDetails.room}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--dp-muted)', marginTop: '4px' }}>
                        Period: {data.currentDetails.period}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--dp-success)', margin: '14px 0' }}>
                      <CheckCircle2 size={18} />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Currently available. No session right now.</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)', borderTop: '1px solid var(--dp-border-light)', paddingTop: '10px' }}>
                  Next Change: <strong>{data.nextStatusChange || 'No further schedule today'}</strong>
                </div>
              </div>
            </div>

            {/* Timetable Schedule Table */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '12px' }}>
                {dayFilter ? `${dayFilter} Timetable` : 'Weekly Schedule'} ({data.schedule ? data.schedule.length : 0} Sessions)
              </div>

              {data.schedule && data.schedule.length > 0 ? (
                <div className="dp-table-container" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--dp-surface)', borderBottom: '1px solid var(--dp-border)', color: 'var(--dp-secondary)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Day</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Period & Time</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Subject</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Class / Section</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Venue</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.schedule.map((entry, idx) => (
                        <tr
                          key={entry._id || idx}
                          style={{
                            borderBottom: '1px solid var(--dp-border-light)',
                            background: entry.isLive ? 'var(--dp-primary-soft)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--dp-text)' }}>
                            {entry.day}
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="dp-period-badge">{entry.period}</span>
                              <span style={{ color: 'var(--dp-secondary)', fontSize: '0.82rem' }}>{entry.time}</span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
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

                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontWeight: 600, color: 'var(--dp-text)' }}>
                              {formatAcademicSection(entry.className)}
                            </span>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <DoorOpen size={14} style={{ color: 'var(--dp-muted)', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: 'var(--dp-text)' }}>{entry.room}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--dp-secondary)', marginLeft: '4px' }}>
                                  ({entry.roomType || 'Classroom'})
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {entry.isLive ? (
                              <span className="dp-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="dp-status-dot green"></span>
                                <span>LIVE NOW</span>
                              </span>
                            ) : entry.isSubstituted ? (
                              <span className="dp-badge-substituted">SUBSTITUTED</span>
                            ) : (
                              <span className="dp-status-badge active">SCHEDULED</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="dp-btn dp-btn-outline dp-btn-sm"
                              onClick={() => {
                                if (inspectEntity) {
                                  inspectEntity({
                                    category: entry.roomType?.toUpperCase() === 'LAB' ? 'LAB' : (entry.roomType?.toUpperCase() === 'AUDITORIUM' ? 'AUDITORIUM' : 'CLASSROOM'),
                                    id: entry.roomId || entry.room,
                                    title: `Room ${entry.room}`,
                                    details: entry
                                  });
                                }
                              }}
                            >
                              <ExternalLink size={13} />
                              <span>View Venue</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="dp-empty-card" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)', padding: '40px', textAlign: 'center' }}>
                  <CheckCircle2 size={36} style={{ color: 'var(--dp-success)', margin: '0 auto 12px auto' }} />
                  <h4 style={{ margin: '0 0 6px 0', color: 'var(--dp-text)', fontSize: '1.1rem' }}>No Scheduled Classes</h4>
                  <p style={{ margin: 0, color: 'var(--dp-secondary)', fontSize: '0.88rem' }}>
                    {data.faculty?.fullName} has no scheduled timetable sessions {dayFilter ? `on ${dayFilter}` : 'for the entire week'}.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : searched ? (
          <div className="dp-empty-card">
            <AlertCircle size={28} />
            <p>No records found for the selected faculty member.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeanFacultySearchPage;
