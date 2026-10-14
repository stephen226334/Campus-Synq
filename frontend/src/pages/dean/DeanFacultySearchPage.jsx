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
  Building
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import { parseTimeToMinutes, DAY_INDEX } from '../../utils/timetableSort';

export const DeanFacultySearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFaculty = searchParams.get('faculty') || 'Prof. Ravi';
  const initialDay = searchParams.get('day') || '';

  const [facultyQuery, setFacultyQuery] = useState(initialFaculty);
  const [dayFilter, setDayFilter] = useState(initialDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const commonFaculties = ['Prof. Ravi', 'Subu', 'Dr. Kumar', 'John', 'Dr. Alan Turing', 'Prof. Ada Lovelace'];

  const executeSearch = async (targetFaculty = facultyQuery, targetDay = dayFilter) => {
    try {
      setLoading(true);
      const res = await deanApi.getFacultyWiseSearch({
        faculty: targetFaculty,
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

  useEffect(() => {
    executeSearch(initialFaculty, initialDay);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ faculty: facultyQuery, ...(dayFilter ? { day: dayFilter } : {}) });
    executeSearch();
  };

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
              View a faculty member's timetable and current status.
            </p>
          </div>
        </div>
      </div>

      {/* Search Input Card */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-faculty-search-grid">
          <div className="dp-form-field">
            <label className="dp-form-label" htmlFor="faculty-input">Faculty Name or ID</label>
            <div className="dp-form-input-wrapper">
              <Users size={16} className="dp-form-icon" />
              <input
                id="faculty-input"
                type="text"
                value={facultyQuery}
                onChange={(e) => setFacultyQuery(e.target.value)}
                placeholder="Search Prof. Ravi, Subu, John, Dr. Kumar..."
                required
              />
            </div>
            <div className="dp-quick-tags">
              {commonFaculties.map((f) => (
                <button
                  type="button"
                  key={f}
                  className={`dp-quick-tag ${facultyQuery === f ? 'active' : ''}`}
                  onClick={() => setFacultyQuery(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="dp-form-field">
            <label className="dp-form-label" htmlFor="faculty-day-filter">Day Filter (Optional)</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={16} className="dp-form-icon" />
              <select
                id="faculty-day-filter"
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
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

          <div className="dp-form-field dp-form-actions">
            <label className="dp-form-label dp-label-spacer">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-primary"
              disabled={loading}
              id="btn-search-faculty"
            >
              <Search size={16} />
              <span>{loading ? 'Searching...' : 'Search Faculty'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Faculty Details & Status Card */}
      <div className="dp-faculty-output-section">
        {loading ? (
          <div className="dp-loading-card">
            <div className="dp-skeleton-line" style={{ width: '45%', height: '24px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '100%', height: '160px', marginTop: '16px' }}></div>
          </div>
        ) : data ? (
          <>
            {/* Top Status Banner: Prominently displaying Live Calculated Status */}
            <div className="dp-faculty-status-banner">
              <div className="dp-status-banner-left">
                <div className="dp-faculty-avatar-large">
                  {(data.faculty?.fullName || 'F')[0].toUpperCase()}
                </div>
                <div className="dp-faculty-meta">
                  <h2 className="dp-faculty-name">{data.faculty?.fullName}</h2>
                  <div className="dp-faculty-submeta">
                    <span className="dp-meta-tag">{data.faculty?.designation || 'Faculty Member'}</span>
                    <span className="dp-meta-id">{data.faculty?.facultyId}</span>
                    <span className="dp-meta-dept">Computer Science Department</span>
                  </div>
                </div>
              </div>

              {/* Dynamic Live Status Badge */}
              <div className="dp-status-banner-right">
                <span className="dp-status-banner-label">CURRENT STATUS:</span>
                <div className={`dp-faculty-live-badge ${data.currentStatusColor || 'green'}`}>
                  <span className={`dp-status-pulse-dot ${data.currentStatusColor || 'green'}`}></span>
                  <span className="dp-live-badge-text">
                    {data.currentStatusBadge?.replace('IN CLASS', 'TEACHING') || 'AVAILABLE'}
                  </span>
                </div>
                {data.nextStatusChange && (
                  <span className="dp-next-status-hint">Next: {data.nextStatusChange}</span>
                )}
              </div>
            </div>

            {/* Timetable Schedule Table */}
            <div className="dp-room-table-card">
              <div className="dp-room-table-header">
                <div className="dp-room-title-meta">
                  <span className="dp-room-tag">{dayFilter ? "Today's Schedule" : "Weekly Schedule"}</span>
                  <span className="dp-room-day-label">
                    {dayFilter ? `${dayFilter} Timetable` : 'Weekly Schedule'}
                  </span>
                  <span className="dp-room-cap-chip">{data.schedule?.length || 0} Total Sessions</span>
                </div>

                <button
                  type="button"
                  className="dp-btn-secondary"
                  onClick={() => {
                    if (inspectEntity) {
                      inspectEntity({
                        category: 'FACULTY',
                        entityType: 'FACULTY',
                        id: data.faculty?._id,
                        title: data.faculty?.fullName,
                        details: data.faculty
                      });
                    }
                  }}
                >
                  <ExternalLink size={14} />
                  <span>View Full Profile</span>
                </button>
              </div>

              <div className="dp-table-container">
                <table className="dp-table">
                  <thead>
                    <tr>
                      <th>DAY</th>
                      <th>PERIOD</th>
                      <th>TIME</th>
                      <th>CLASS</th>
                      <th>SUBJECT</th>
                      <th>ROOM</th>
                      <th>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.schedule?.length > 0 ? (
                      data.schedule.map((slot) => (
                        <tr key={slot._id || `${slot.day}-${slot.period}`}>
                          <td className="dp-td-day">
                            <strong>{slot.day}</strong>
                          </td>
                          <td className="dp-td-period">
                            <span className="dp-period-badge">{slot.period}</span>
                          </td>
                          <td className="dp-td-time">
                            <span className="dp-time-text">{slot.time}</span>
                          </td>
                          <td className="dp-td-class">
                            <span>{formatAcademicSection(slot.className)}</span>
                          </td>
                          <td className="dp-td-subject">
                            <div className="dp-subject-cell">
                              <span>{slot.subject}</span>
                              {slot.subjectCode && <span className="dp-code-chip">{slot.subjectCode}</span>}
                            </div>
                          </td>
                          <td className="dp-td-room">
                            <span className="dp-room-badge">{slot.room}</span>
                          </td>
                          <td className="dp-td-status">
                            <span className={`dp-status-badge ${slot.isLive ? 'occupied' : 'scheduled'}`}>
                              <span className={`dp-status-dot ${slot.isLive ? 'red' : 'purple'}`}></span>
                              <span>{slot.isLive ? 'LIVE' : slot.status}</span>
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                          <span className="dp-text-muted">No scheduled classes for this faculty on this day.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default DeanFacultySearchPage;
