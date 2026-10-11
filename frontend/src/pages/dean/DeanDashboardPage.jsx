import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useOutletContext, Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  BookOpen,
  DoorOpen,
  Layers,
  Cpu,
  Tv,
  Calendar,
  Clock,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Activity,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import deanApi from '../../api/dean';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';
import {
  formatAcademicSection,
  formatAcademicSectionSplit,
  formatAcademicRoom,
  formatTimeRange12h,
  formatAcademicStatus,
  formatAcademicFaculty
} from '../../utils/academicFormatter';

export const DeanDashboardPage = () => {
  const navigate = useNavigate();
  const { openEntityDrawer, refreshKey } = useOutletContext() || {};

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const searchBoxRef = useRef(null);

  // Auto-ticking live clock (strictly 12-hour format)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick search autocomplete suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await deanApi.getQuickSearch(searchQuery.trim());
        setSuggestions(res.data?.suggestions || []);
      } catch (err) {
        console.error('Quick search suggestions failed:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await deanApi.getDashboard();
      setDashboardData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load Dean dashboard:', err);
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey]);

  const handleRealtimeSync = useCallback(() => {
    fetchDashboard();
  }, []);

  // Real-time updates via Server-Sent Events (SSE) with auto-reconnection and stale data reload
  useRealtimeEvents(handleRealtimeSync, {
    endpoint: '/api/v1/dean/events',
    onReconnect: handleRealtimeSync
  });

  // Format 12-hour time without seconds: "10:35 AM"
  const formattedTime12h = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/dean/current-status?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const liveStats = dashboardData?.liveStats || {};
  const metrics = dashboardData?.metrics || {};
  const currentlyActiveClasses = dashboardData?.currentlyActiveClasses || [];
  const todaySchedule = dashboardData?.todaySchedule || [];

  return (
    <div className="dp-dashboard-container">
      {/* 1. TOP HEADER & GREETING */}
      <div className="dp-greeting-card">
        <div>
          <div className="dp-dashboard-main-title">Dean Dashboard</div>
          <div className="dp-dashboard-subtitle">
            <span>Computer Science Department — Academic Overview</span>
          </div>
        </div>

        <div className="dp-greeting-time-box">
          <div className="dp-live-time-display">
            <Clock size={16} style={{ color: 'var(--dp-primary)', marginRight: '6px' }} />
            <span>{formattedTime12h}</span>
          </div>
          <div className="dp-live-date-display">{formattedDate}</div>
        </div>
      </div>

      {/* 2. QUICK SEARCH BAR (Class / Faculty / Room) */}
      <div className="dp-quick-search-section" ref={searchBoxRef}>
        <form onSubmit={handleSearchSubmit}>
          <div className="dp-quick-search-bar">
            <Search size={20} className="dp-search-icon" />
            <input
              type="text"
              className="dp-quick-search-input"
              placeholder="Search class, faculty or room..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              id="dean-quick-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="dp-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                aria-label="Clear Search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="dp-btn-primary dp-btn-quick-search-go"
            >
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Live Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="dp-quick-suggestions-dropdown">
            <div className="dp-suggestions-header">Instant Academic Suggestions</div>
            {suggestions.map((item, idx) => (
              <div
                key={`${item.type}-${item.id || idx}`}
                className="dp-suggestion-item"
                onClick={() => {
                  setShowSuggestions(false);
                  navigate(item.url);
                }}
              >
                <div className="dp-sugg-type-badge">{item.type}</div>
                <div className="dp-sugg-content">
                  <div className="dp-sugg-title">{item.title}</div>
                  <div className="dp-sugg-sub">{item.subtitle}</div>
                </div>
                <ChevronRight size={16} className="dp-sugg-arrow" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SIX CORE SUMMARY CARDS (Strictly Real MongoDB data) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Calculating live academic status from MongoDB...</span>
        </div>
      ) : error ? (
        <div className="dp-form-alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            type="button"
            className="dp-btn dp-btn-outline dp-btn-sm"
            onClick={fetchDashboard}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <>
          <div className="dp-six-metrics-grid">
            {/* 1. TODAY'S CLASSES */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/timetable')}
              title="Inspect Master Timetable"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Today's Classes</span>
                <span className="dp-stat-icon-wrap purple"><Calendar size={18} /></span>
              </div>
              <div className="dp-stat-value">{liveStats.totalClasses ?? todaySchedule.length ?? 0}</div>
              <div className="dp-stat-subtext">Classes scheduled today</div>
            </div>

            {/* 2. CLASSES RUNNING NOW */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/current-status')}
              title="Inspect live running classes"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Classes Running Now</span>
                <span className="dp-stat-icon-wrap live"><Activity size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-live">{liveStats.classesRunningNow ?? 0}</div>
              <div className="dp-stat-subtext">
                {(liveStats.classesRunningNow ?? 0) === 0 ? 'No classes in progress' : 'Classes currently in progress'}
              </div>
            </div>

            {/* 3. AVAILABLE ROOMS */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/free-rooms')}
              title="Inspect Free Rooms Search"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Available Rooms</span>
                <span className="dp-stat-icon-wrap green"><DoorOpen size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-green">{liveStats.freeRooms ?? 0}</div>
              <div className="dp-stat-subtext">Rooms currently available</div>
            </div>

            {/* 4. OCCUPIED ROOMS */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/room-search')}
              title="Inspect Room Timetables"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Occupied Rooms</span>
                <span className="dp-stat-icon-wrap red"><DoorOpen size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-red">{liveStats.occupiedRooms ?? 0}</div>
              <div className="dp-stat-subtext">Rooms currently in use</div>
            </div>

            {/* 5. FACULTY TEACHING NOW */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/faculty-search')}
              title="Inspect Faculty Status"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Faculty Teaching Now</span>
                <span className="dp-stat-icon-wrap orange"><Users size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-orange">{liveStats.facultyInClass ?? 0}</div>
              <div className="dp-stat-subtext">Faculty currently teaching</div>
            </div>

            {/* 6. FACULTY AVAILABLE */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/faculty-search')}
              title="Inspect Available Faculty"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Faculty Available</span>
                <span className="dp-stat-icon-wrap blue"><UserCheck size={18} /></span>
              </div>
              <div className="dp-stat-value">{liveStats.freeFaculty ?? 0}</div>
              <div className="dp-stat-subtext">Faculty without a current class</div>
            </div>
          </div>

          {/* 4. LIVE DASHBOARD STATUS: CLASSES RUNNING NOW */}
          <div className="dp-section-card">
            <div className="dp-section-card-header">
              <div>
                <div className="dp-section-card-title">
                  <span className="dp-status-dot red"></span>
                  <span>Classes Running Now</span>
                </div>
                <div className="dp-section-card-sub">
                  Classes currently in progress
                </div>
              </div>
              <Link to="/dean/timetable" className="dp-btn-link">
                <span>View Current Schedule</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            {currentlyActiveClasses.length > 0 ? (
              <div className="dp-live-classes-grid">
                {currentlyActiveClasses.map((item) => {
                  const secSplit = formatAcademicSectionSplit(item.section, item.semester);
                  const roomSplit = formatAcademicRoom(item.room, item.roomType);
                  const timeFormatted = formatTimeRange12h(item.time);
                  return (
                    <div
                      key={item._id}
                      className="dp-live-class-card"
                      onClick={() => {
                        if (openEntityDrawer) {
                          openEntityDrawer({
                            entityType: 'TIMETABLE',
                            id: item._id,
                            title: `${item.period} — ${item.subject}`,
                            details: item
                          });
                        }
                      }}
                    >
                      <div className="dp-live-card-top">
                        <span className="dp-period-badge">{item.period}</span>
                        <span className="dp-live-time-range">{timeFormatted}</span>
                        <span className="dp-status-badge live">LIVE NOW</span>
                      </div>

                      <div className="dp-live-subject">{item.subject}</div>

                      <div className="dp-live-meta-grid">
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Section:</span>
                          <span className="dp-live-val">
                            {secSplit.program ? `${secSplit.program} — ${secSplit.section}` : secSplit.section}
                          </span>
                        </div>
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Faculty:</span>
                          <div className="dp-live-faculty-wrap">
                            <span className="dp-live-val">{formatAcademicFaculty(item.faculty)}</span>
                            {item.isSubstituted && (
                              <span className="dp-badge-substituted">SUBSTITUTED</span>
                            )}
                          </div>
                        </div>
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Room:</span>
                          <span className="dp-live-val">{roomSplit.number}</span>
                          {roomSplit.type && <span className="dp-live-room-type">({roomSplit.type})</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dp-empty-live-box">
                <div className="dp-empty-live-icon-wrap">
                  <Clock size={28} className="dp-empty-live-icon" />
                </div>
                <div className="dp-empty-live-text-wrap">
                  <div className="dp-empty-live-heading">No Classes Running Now</div>
                  <div className="dp-empty-live-description">There are no active classes at the moment.</div>
                </div>
                <Link to="/dean/timetable" className="dp-btn dp-btn-primary dp-btn-sm dp-empty-live-btn">
                  <span>View Current Schedule</span>
                </Link>
              </div>
            )}
          </div>

          {/* 5. OVERVIEW DUAL CARDS: ROOM AVAILABILITY & FACULTY STATUS */}
          <div className="dp-overview-dual-grid">
            {/* ROOM AVAILABILITY */}
            <div className="dp-overview-card">
              <div className="dp-overview-card-header">
                <div>
                  <h3 className="dp-overview-title">Room Availability</h3>
                  <p className="dp-overview-sub">Current room usage across the department</p>
                </div>
                <Link to="/dean/free-rooms" className="dp-btn-sm dp-btn-outline">
                  View Rooms &rarr;
                </Link>
              </div>

              <div className="dp-util-split-stats">
                <div
                  className="dp-util-stat-box green"
                  onClick={() => navigate('/dean/free-rooms')}
                  title="Click to view Available Rooms"
                >
                  <span className="dp-util-num">{liveStats.freeRooms ?? 0}</span>
                  <span className="dp-util-lbl">Available Rooms</span>
                </div>
                <div
                  className="dp-util-stat-box red"
                  onClick={() => navigate('/dean/room-search')}
                  title="Click to inspect Occupied Rooms"
                >
                  <span className="dp-util-num">{liveStats.occupiedRooms ?? 0}</span>
                  <span className="dp-util-lbl">Occupied Rooms</span>
                </div>
              </div>

              <div className="dp-util-total-strip">
                <span>Total Rooms: <strong>{liveStats.totalRooms || 30}</strong></span>
                <span className="dp-util-link" onClick={() => navigate('/dean/free-rooms')}>View Rooms →</span>
              </div>
            </div>

            {/* FACULTY STATUS */}
            <div className="dp-overview-card">
              <div className="dp-overview-card-header">
                <div>
                  <h3 className="dp-overview-title">Faculty Status</h3>
                  <p className="dp-overview-sub">Current teaching availability</p>
                </div>
                <Link to="/dean/faculty-search" className="dp-btn-sm dp-btn-outline">
                  View Faculty →
                </Link>
              </div>

              <div className="dp-util-split-stats">
                <div
                  className="dp-util-stat-box orange"
                  onClick={() => navigate('/dean/faculty-search')}
                  title="Click to view Faculty Teaching Now"
                >
                  <span className="dp-util-num">{liveStats.facultyInClass ?? 0}</span>
                  <span className="dp-util-lbl">Teaching Now</span>
                </div>
                <div
                  className="dp-util-stat-box blue"
                  onClick={() => navigate('/dean/faculty-search')}
                  title="Click to view Available Faculty"
                >
                  <span className="dp-util-num">{liveStats.freeFaculty ?? 0}</span>
                  <span className="dp-util-lbl">Available</span>
                </div>
              </div>

              <div className="dp-util-total-strip">
                <span>Total Faculty: <strong>{liveStats.totalFaculty || metrics.activeFaculty || 6}</strong></span>
                <span className="dp-util-link" onClick={() => navigate('/dean/faculty-search')}>View Faculty →</span>
              </div>
            </div>
          </div>

          {/* 6. TODAY'S TIMETABLE */}
          <div className="dp-section-card">
            <div className="dp-section-card-header">
              <div>
                <div className="dp-section-card-title">Today's Timetable</div>
                <div className="dp-section-card-sub">
                  Computer Science Department — {formattedDate}
                </div>
              </div>
              <Link to="/dean/timetable" className="dp-btn-link">
                <span>View Full Timetable →</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            <div className="dp-table-container">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>PERIOD</th>
                    <th>TIME</th>
                    <th>SUBJECT</th>
                    <th>FACULTY</th>
                    <th>SECTION</th>
                    <th>ROOM</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.length > 0 ? (
                    todaySchedule.map((item) => {
                      const secSplit = formatAcademicSectionSplit(item.section, item.semester);
                      const roomSplit = formatAcademicRoom(item.room, item.roomType);
                      const timeFormatted = formatTimeRange12h(item.time);
                      const statusFormatted = formatAcademicStatus(item.status, 'SESSION');
                      const isLive = statusFormatted === 'LIVE NOW' || item.status === 'LIVE';

                      return (
                        <tr
                          key={item._id}
                          onClick={() => {
                            if (openEntityDrawer) {
                              openEntityDrawer({
                                entityType: 'TIMETABLE',
                                id: item._id,
                                title: `${item.period} — ${item.subject}`,
                                details: item
                              });
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          className={isLive ? 'dp-row-live' : ''}
                        >
                          <td className="dp-td-period">
                            <span className="dp-period-badge">{item.period}</span>
                          </td>
                          <td className="dp-td-time">
                            <span className="dp-time-text">{timeFormatted}</span>
                          </td>
                          <td className="dp-td-subject">
                            <div className="dp-subject-cell">
                              <span className="dp-subject-name">{item.subject}</span>
                              {item.subjectCode && (
                                <span className="dp-subject-code">{item.subjectCode}</span>
                              )}
                            </div>
                          </td>
                          <td className="dp-td-faculty">
                            <div className="dp-faculty-cell">
                              {item.isSubstituted && item.originalFaculty ? (
                                <div className="dp-faculty-sub-split">
                                  <span className="dp-faculty-name">{formatAcademicFaculty(item.faculty)}</span>
                                  <span className="dp-sub-orig-label">Sub for {formatAcademicFaculty(item.originalFaculty)}</span>
                                  <span className="dp-badge-substituted">SUBSTITUTED</span>
                                </div>
                              ) : (
                                <>
                                  <span className="dp-faculty-name">{formatAcademicFaculty(item.faculty)}</span>
                                  {item.isSubstituted && (
                                    <span className="dp-badge-substituted">SUBSTITUTED</span>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                          <td className="dp-td-section">
                            <div className="dp-section-cell">
                              {secSplit.program ? (
                                <>
                                  <span className="dp-section-program">{secSplit.program}</span>
                                  <span className="dp-section-name">{secSplit.section}</span>
                                </>
                              ) : (
                                <span className="dp-section-name-only">{secSplit.section}</span>
                              )}
                            </div>
                          </td>
                          <td className="dp-td-room">
                            <div className="dp-room-cell">
                              <span className="dp-room-num">{roomSplit.number}</span>
                              {roomSplit.type && <span className="dp-room-type">{roomSplit.type}</span>}
                            </div>
                          </td>
                          <td className="dp-td-status">
                            <span className={`dp-status-badge ${isLive ? 'live' : (statusFormatted === 'UPCOMING' ? 'upcoming' : 'completed')}`}>
                              {statusFormatted}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                        <span className="dp-text-muted">No scheduled classes found for today.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeanDashboardPage;
