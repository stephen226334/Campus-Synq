import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  DoorOpen,
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Users
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import SearchableDropdown from '../../components/common/SearchableDropdown';

export const DeanClassSearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();

  const [sections, setSections] = useState([]);
  const [loadingSections, setLoadingSections] = useState(true);
  const [sectionsError, setSectionsError] = useState(null);

  const initialSection = searchParams.get('section') || searchParams.get('class') || '';
  const initialDay = searchParams.get('day') || 'Monday';
  const initialTime = searchParams.get('time') || 'All Periods';

  const [selectedSectionId, setSelectedSectionId] = useState(initialSection);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { showToast } = useToast();

  const daysList = ['All Days', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timesList = [
    'All Periods',
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM'
  ];

  // 1. Fetch Class Sections dynamically from database
  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoadingSections(true);
        setSectionsError(null);
        const res = await deanApi.getSectionList();
        const sectionList = res.data || [];
        setSections(sectionList);

        // If no section in URL and sections exist, default to the first section
        if (!initialSection && sectionList.length > 0) {
          setSelectedSectionId(sectionList[0]._id);
        } else if (initialSection && sectionList.length > 0) {
          // Check if initialSection is an ID or Name
          const matched = sectionList.find(
            (s) => s._id === initialSection || s.name.toLowerCase() === initialSection.toLowerCase()
          );
          if (matched) {
            setSelectedSectionId(matched._id);
          }
        }
      } catch (err) {
        console.error('Failed to load class sections:', err);
        setSectionsError('Unable to load class sections from server');
      } finally {
        setLoadingSections(false);
      }
    };

    fetchSections();
  }, []);

  // Format section options for SearchableDropdown
  const sectionOptions = React.useMemo(() => {
    return sections.map((s) => ({
      value: s._id,
      label: formatAcademicSection(s.name),
      subLabel: s.semester?.name ? `Semester: ${s.semester.name}` : (s.name || ''),
      badge: s.capacity ? `Cap: ${s.capacity}` : undefined,
      searchTerms: `${s.name} ${s.semester?.name || ''} ${formatAcademicSection(s.name)}`,
      raw: s
    }));
  }, [sections]);

  // Execute Timetable Search
  const executeSearch = async (targetSectionId = selectedSectionId, targetDay = day, targetTime = time) => {
    if (!targetSectionId) return;

    try {
      setLoading(true);
      setSearched(true);

      const params = {
        sectionId: targetSectionId,
        day: targetDay === 'All Days' ? 'ALL' : targetDay,
        time: targetTime === 'All Periods' ? 'ALL' : targetTime
      };

      const res = await deanApi.getClassWiseSearch(params);
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to complete class timetable search', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run search when default section is selected
  useEffect(() => {
    if (selectedSectionId && !searched) {
      executeSearch(selectedSectionId, day, time);
    }
  }, [selectedSectionId]);

  // React to URL search param updates while mounted
  useEffect(() => {
    const urlSection = searchParams.get('section') || searchParams.get('class');
    const urlDay = searchParams.get('day');
    const urlTime = searchParams.get('time');

    if (urlDay && urlDay !== day) setDay(urlDay);
    if (urlTime && urlTime !== time) setTime(urlTime);

    if (urlSection && sections.length > 0) {
      const matched = sections.find(
        (s) => s._id === urlSection || s.name.toLowerCase() === urlSection.toLowerCase()
      );
      if (matched && matched._id !== selectedSectionId) {
        setSelectedSectionId(matched._id);
        executeSearch(matched._id, urlDay || day, urlTime || time);
      }
    }
  }, [searchParams, sections]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedSectionId) {
      showToast('Please select a class section to search', 'warning');
      return;
    }
    setSearchParams({
      section: selectedSectionId,
      day,
      time
    });
    executeSearch();
  };

  const currentSection = sections.find((s) => s._id === selectedSectionId);

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Class Search</h1>
            <p className="dp-page-subtitle">
              Inspect schedules, subjects, assigned faculty, and venues for any class section.
            </p>
          </div>
        </div>
      </div>

      {/* Search Filter Form */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-class-search-grid">
          {/* 1. Dynamic Class / Section Dropdown */}
          <div className="dp-form-field">
            <SearchableDropdown
              id="search-class-section"
              label="Class / Section"
              options={sectionOptions}
              value={selectedSectionId}
              onChange={(val) => {
                setSelectedSectionId(val);
                if (val) executeSearch(val, day, time);
              }}
              placeholder="Search or select class section..."
              loading={loadingSections}
              loadingText="Loading class sections..."
              error={sectionsError}
              icon={Users}
              required
            />
          </div>

          {/* 2. Day Filter */}
          <div className="dp-form-field">
            <label className="dp-form-label" htmlFor="search-day">Day Filter</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={16} className="dp-form-icon" />
              <select
                id="search-day"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {daysList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Time Filter */}
          <div className="dp-form-field">
            <label className="dp-form-label" htmlFor="search-time">Time Filter</label>
            <div className="dp-form-input-wrapper">
              <Clock size={16} className="dp-form-icon" />
              <select
                id="search-time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {timesList.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Action Button */}
          <div className="dp-form-field dp-form-actions">
            <label className="dp-form-label dp-label-spacer">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-primary"
              disabled={loading || loadingSections}
              id="btn-search-class"
            >
              <Search size={16} />
              <span>{loading ? 'Searching...' : 'Search Class'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      <div className="dp-results-container">
        {loading ? (
          <div className="dp-loading-card">
            <div className="dp-skeleton-line" style={{ width: '40%', height: '24px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '80%', height: '16px', marginTop: '12px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '60%', height: '16px', marginTop: '8px' }}></div>
          </div>
        ) : data ? (
          <div>
            {/* Section Overview Card */}
            <div
              style={{
                background: 'var(--dp-card)',
                border: '1px solid var(--dp-border)',
                borderRadius: 'var(--dp-radius-md)',
                padding: '20px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: 'var(--dp-shadow-subtle)'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="dp-period-badge">
                    {data.section?.semester?.name || 'Academic Section'}
                  </span>
                  <span className="dp-status-badge active">
                    {data.totalSessions || (data.timetable ? data.timetable.length : 0)} Sessions Scheduled
                  </span>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--dp-text)' }}>
                  {formatAcademicSection(data.section?.name || currentSection?.name || 'Class Section')}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--dp-secondary)' }}>
                  {data.section?.semester?.academicYear ? `Academic Year: ${data.section.semester.academicYear} • ` : ''}
                  Capacity: {data.section?.capacity || currentSection?.capacity || 60} Students
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="dp-result-day-badge">
                  <Calendar size={14} style={{ marginRight: '4px' }} />
                  {day}
                </span>
                {time !== 'All Periods' && (
                  <span className="dp-result-time-badge">
                    <Clock size={14} style={{ marginRight: '4px' }} />
                    {time}
                  </span>
                )}
              </div>
            </div>

            {/* Timetable Schedule List */}
            {data.timetable && data.timetable.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--dp-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Scheduled Sessions ({data.timetable.length})
                </div>

                <div className="dp-table-container" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--dp-surface)', borderBottom: '1px solid var(--dp-border)', color: 'var(--dp-secondary)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Day & Period</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Time</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Subject</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Assigned Faculty</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Allocated Venue</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
                        <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.timetable.map((t, idx) => (
                        <tr
                          key={t._id || idx}
                          style={{
                            borderBottom: '1px solid var(--dp-border-light)',
                            background: t.status === 'LIVE' ? 'var(--dp-primary-soft)' : 'transparent'
                          }}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="dp-period-badge" style={{ fontWeight: 700 }}>
                                {t.period}
                              </span>
                              <span style={{ fontWeight: 600, color: 'var(--dp-text)' }}>
                                {t.day}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px', color: 'var(--dp-secondary)', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Clock size={14} style={{ color: 'var(--dp-muted)' }} />
                              <span>{t.time}</span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <BookOpen size={15} style={{ color: 'var(--dp-primary)', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: 'var(--dp-text)' }}>{t.subject}</strong>
                                {t.subjectCode && (
                                  <span className="dp-code-chip" style={{ marginLeft: '6px' }}>
                                    {t.subjectCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <User size={15} style={{ color: 'var(--dp-secondary)', flexShrink: 0 }} />
                              <div>
                                <span style={{ color: 'var(--dp-text)', fontWeight: 600 }}>{t.faculty}</span>
                                {t.isSubstituted && (
                                  <span className="dp-badge-substituted" style={{ marginLeft: '6px', fontSize: '0.7rem' }}>
                                    SUBSTITUTED
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <DoorOpen size={15} style={{ color: 'var(--dp-muted)', flexShrink: 0 }} />
                              <div>
                                <strong style={{ color: 'var(--dp-text)' }}>{t.room}</strong>
                                <span style={{ fontSize: '0.75rem', color: 'var(--dp-secondary)', marginLeft: '6px' }}>
                                  ({t.roomType || 'Classroom'})
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 16px' }}>
                            {t.status === 'LIVE' ? (
                              <span className="dp-status-badge active" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <span className="dp-status-dot green"></span>
                                <span>LIVE NOW</span>
                              </span>
                            ) : t.isCombinedClass ? (
                              <span className="dp-period-badge" style={{ background: '#ede9fe', color: '#6d28d9', borderColor: '#c4b5fd' }}>
                                COMBINED
                              </span>
                            ) : (
                              <span className="dp-status-badge active">
                                SCHEDULED
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              type="button"
                              className="dp-btn dp-btn-outline dp-btn-sm"
                              onClick={() => {
                                if (inspectEntity) {
                                  inspectEntity({
                                    category: t.roomType?.toUpperCase() === 'LAB' ? 'LAB' : (t.roomType?.toUpperCase() === 'AUDITORIUM' ? 'AUDITORIUM' : 'CLASSROOM'),
                                    id: t.roomId || t.room,
                                    title: `Room ${t.room}`,
                                    details: t
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
              </div>
            ) : (
              <div className="dp-empty-card" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)', padding: '40px', textAlign: 'center' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--dp-success)', margin: '0 auto 12px auto' }} />
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--dp-text)', fontSize: '1.1rem' }}>No Classes Scheduled</h4>
                <p style={{ margin: 0, color: 'var(--dp-secondary)', fontSize: '0.88rem' }}>
                  There are no scheduled timetable sessions for {formatAcademicSection(data.section?.name || currentSection?.name || 'this class section')} on {day} {time !== 'All Periods' ? `during ${time}` : ''}.
                </p>
              </div>
            )}
          </div>
        ) : searched ? (
          <div className="dp-empty-card">
            <AlertCircle size={28} />
            <p>No timetable records found for the selected class section.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeanClassSearchPage;
