import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  DoorOpen,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Calendar,
  Search,
  ExternalLink,
  CheckCircle2,
  X,
  ChevronRight,
  HelpCircle,
  AlertCircle,
  Building,
  GraduationCap,
  Mail,
  BookOpen
} from 'lucide-react';
import {
  formatAcademicSectionSplit,
  formatAcademicRoom,
  formatTimeRange12h,
  formatAcademicFaculty
} from '../../utils/academicFormatter';

export const LiveAcademicStatusModal = ({
  isOpen,
  onClose,
  initialTab = 'LIVE_CLASSES',
  dashboardData,
  onSelectClass
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchFilter, setSearchFilter] = useState('');
  const [venueTypeFilter, setVenueTypeFilter] = useState('ALL');
  const [venueAvailabilityFilter, setVenueAvailabilityFilter] = useState('ALL');
  const [facultyCategoryFilter, setFacultyCategoryFilter] = useState('ALL');

  // Sync activeTab when initialTab or isOpen changes
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    setSearchFilter('');
    setVenueTypeFilter('ALL');
    setVenueAvailabilityFilter('ALL');
    setFacultyCategoryFilter('ALL');
  }, [initialTab, isOpen]);

  // Lock background scrolling and handle Escape key
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const {
    liveStats = {},
    currentlyActiveClasses = [],
    occupiedVenues = [],
    availableVenues = [],
    teachingFaculty = [],
    availableFaculty = [],
    conflicts = [],
    currentAcademicContext = {},
    todaySchedule = []
  } = dashboardData || {};

  const currentPeriod = currentAcademicContext.currentPeriod;
  const currentPeriodTiming = currentAcademicContext.currentPeriodTiming;
  const currentTime12 = currentAcademicContext.currentTime12;
  const todayDay = currentAcademicContext.todayDay;

  // 12-hour time formatter helper
  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const trimmed = timeStr.trim();
    if (/am|pm/i.test(trimmed)) return trimmed;
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (match) {
      let hours = parseInt(match[1], 10);
      const mins = match[2];
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${mins} ${ampm}`;
    }
    return trimmed;
  };

  const getOccupiedUntilText = (runningClass) => {
    if (!runningClass) return 'Occupied by active class';
    let end = runningClass.endTime || '';
    if (!end && runningClass.time) {
      const parts = runningClass.time.split(/[-–—]/);
      end = parts[1]?.trim() || '';
    }
    if (end) {
      const formattedEnd = formatTime12h(end);
      return `Occupied until ${formattedEnd}`;
    }
    return 'Occupied by active class';
  };

  // Combine occupied and available venues into unified list for Available Venues Explorer
  const allCampusVenues = useMemo(() => {
    const occupied = (occupiedVenues || []).map(v => ({
      ...v,
      isOccupied: true,
      statusBadge: 'OCCUPIED',
      statusBadgeClass: 'occupied',
      statusDescription: getOccupiedUntilText(v.runningClass)
    }));
    const available = (availableVenues || []).map(v => ({
      ...v,
      isOccupied: false,
      statusBadge: 'AVAILABLE NOW',
      statusBadgeClass: 'available',
      statusDescription: 'Free at current time'
    }));
    return [...occupied, ...available].sort((a, b) =>
      (a.identifier || '').localeCompare(b.identifier || '', undefined, { numeric: true })
    );
  }, [occupiedVenues, availableVenues]);

  // Venue search matcher
  const venueMatchesSearch = (v, q) => {
    if (!q) return true;
    const ident = (v.identifier || '').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const type = (v.venueType || '').toLowerCase();
    if (ident.includes(q) || name.includes(q) || type.includes(q)) return true;
    if (v.runningClass) {
      const sub = (v.runningClass.subject || '').toLowerCase();
      const subCode = (v.runningClass.subjectCode || '').toLowerCase();
      const fac = (v.runningClass.faculty || '').toLowerCase();
      const sec = (v.runningClass.section || '').toLowerCase();
      if (sub.includes(q) || subCode.includes(q) || fac.includes(q) || sec.includes(q)) return true;
    }
    return false;
  };

  // Venues matching search query
  const venuesMatchingSearch = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return allCampusVenues.filter(v => venueMatchesSearch(v, q));
  }, [allCampusVenues, searchFilter]);

  // Synchronized Venue Counts (reflect active search query)
  const venueTypeCounts = useMemo(() => {
    return {
      all: venuesMatchingSearch.length,
      classroom: venuesMatchingSearch.filter(v => v.venueType?.toLowerCase() === 'classroom').length,
      lab: venuesMatchingSearch.filter(v => v.venueType?.toLowerCase() === 'lab' || v.venueType?.toLowerCase() === 'laboratory').length,
      auditorium: venuesMatchingSearch.filter(v => v.venueType?.toLowerCase() === 'auditorium').length
    };
  }, [venuesMatchingSearch]);

  const venueStatusCounts = useMemo(() => {
    return {
      all: venuesMatchingSearch.length,
      available: venuesMatchingSearch.filter(v => !v.isOccupied).length,
      occupied: venuesMatchingSearch.filter(v => v.isOccupied).length
    };
  }, [venuesMatchingSearch]);

  // Final filtered venues
  const filteredVenues = useMemo(() => {
    return venuesMatchingSearch.filter(v => {
      // Type filter
      if (venueTypeFilter !== 'ALL') {
        const t = v.venueType?.toLowerCase();
        if (venueTypeFilter === 'Classroom' && t !== 'classroom') return false;
        if (venueTypeFilter === 'Lab' && t !== 'lab' && t !== 'laboratory') return false;
        if (venueTypeFilter === 'Auditorium' && t !== 'auditorium') return false;
      }
      // Availability filter
      if (venueAvailabilityFilter === 'AVAILABLE_NOW' && v.isOccupied) return false;
      if (venueAvailabilityFilter === 'OCCUPIED' && !v.isOccupied) return false;
      return true;
    });
  }, [venuesMatchingSearch, venueTypeFilter, venueAvailabilityFilter]);

  // Faculty search matcher (Faculty Name, Faculty ID, and Subject Name or Code)
  const facultyMatchesSearch = (faculty, q) => {
    if (!q) return true;
    const name = (faculty.fullName || '').toLowerCase();
    const empId = (faculty.employeeId || '').toLowerCase();
    const desig = (faculty.designation || '').toLowerCase();
    const dept = (faculty.department || '').toLowerCase();
    const email = (faculty.officialEmail || '').toLowerCase();
    if (name.includes(q) || empId.includes(q) || desig.includes(q) || dept.includes(q) || email.includes(q)) {
      return true;
    }

    // Match active teaching class subject/code
    if (faculty.currentClass) {
      const sub = (faculty.currentClass.subject || '').toLowerCase();
      const code = (faculty.currentClass.subjectCode || '').toLowerCase();
      if (sub.includes(q) || code.includes(q)) return true;
    }

    // Match upcoming class subject/code
    if (faculty.nextClass) {
      const sub = (faculty.nextClass.subject || '').toLowerCase();
      const code = (faculty.nextClass.subjectCode || '').toLowerCase();
      if (sub.includes(q) || code.includes(q)) return true;
    }

    // Match all today scheduled subjects for this faculty
    const facultyIdStr = faculty.facultyId ? faculty.facultyId.toString() : '';
    const assignedToday = (todaySchedule || []).filter(c =>
      (c.facultyDocId && facultyIdStr && c.facultyDocId.toString() === facultyIdStr) ||
      (c.facultyId && faculty.employeeId && c.facultyId === faculty.employeeId) ||
      (c.faculty && faculty.fullName && c.faculty.toLowerCase() === faculty.fullName.toLowerCase())
    );

    for (const c of assignedToday) {
      if (c.subject && c.subject.toLowerCase().includes(q)) return true;
      if (c.subjectCode && c.subjectCode.toLowerCase().includes(q)) return true;
    }

    return false;
  };

  // Faculty matching search query
  const facultyMatchingSearch = useMemo(() => {
    const q = searchFilter.trim().toLowerCase();
    return (availableFaculty || []).filter(f => facultyMatchesSearch(f, q));
  }, [availableFaculty, searchFilter, todaySchedule]);

  // Synchronized Faculty Counts (reflect active search query)
  const facultyCounts = useMemo(() => {
    return {
      all: facultyMatchingSearch.length,
      available: facultyMatchingSearch.filter(f => f.category === 'AVAILABLE_NOW').length,
      teaching: facultyMatchingSearch.filter(f => f.category === 'TEACHING_NOW').length,
      notScheduled: facultyMatchingSearch.filter(f => f.category === 'NOT_SCHEDULED_TODAY').length,
      unknown: facultyMatchingSearch.filter(f => f.category === 'STATUS_UNKNOWN').length
    };
  }, [facultyMatchingSearch]);

  // Final filtered faculty list
  const filteredFaculty = useMemo(() => {
    return facultyMatchingSearch.filter(f => {
      if (facultyCategoryFilter === 'ALL') return true;
      return f.category === facultyCategoryFilter;
    });
  }, [facultyMatchingSearch, facultyCategoryFilter]);

  // Filtered Live Classes for Tab 1
  const filteredLiveClasses = useMemo(() => {
    if (!searchFilter.trim()) return currentlyActiveClasses;
    const q = searchFilter.toLowerCase();
    return currentlyActiveClasses.filter(c =>
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.subjectCode && c.subjectCode.toLowerCase().includes(q)) ||
      (c.faculty && c.faculty.toLowerCase().includes(q)) ||
      (c.section && c.section.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q))
    );
  }, [currentlyActiveClasses, searchFilter]);

  // Filtered Occupied Venues for Tab 2
  const filteredOccupiedVenues = useMemo(() => {
    return occupiedVenues.filter(v => {
      if (venueTypeFilter !== 'ALL' && v.venueType?.toLowerCase() !== venueTypeFilter.toLowerCase()) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      const q = searchFilter.toLowerCase();
      return (
        (v.identifier && v.identifier.toLowerCase().includes(q)) ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.runningClass?.subject && v.runningClass.subject.toLowerCase().includes(q)) ||
        (v.runningClass?.faculty && v.runningClass.faculty.toLowerCase().includes(q)) ||
        (v.runningClass?.section && v.runningClass.section.toLowerCase().includes(q))
      );
    });
  }, [occupiedVenues, venueTypeFilter, searchFilter]);

  // Filtered Teaching Faculty for Tab 4
  const filteredTeachingFaculty = useMemo(() => {
    if (!searchFilter.trim()) return teachingFaculty;
    const q = searchFilter.toLowerCase();
    return teachingFaculty.filter(item =>
      (item.fullName && item.fullName.toLowerCase().includes(q)) ||
      (item.employeeId && item.employeeId.toLowerCase().includes(q)) ||
      (item.department && item.department.toLowerCase().includes(q)) ||
      (item.currentClass?.subject && item.currentClass.subject.toLowerCase().includes(q)) ||
      (item.currentClass?.subjectCode && item.currentClass.subjectCode.toLowerCase().includes(q)) ||
      (item.currentClass?.room && item.currentClass.room.toLowerCase().includes(q))
    );
  }, [teachingFaculty, searchFilter]);

  if (!isOpen || !dashboardData) return null;

  return (
    <div className="dp-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="dp-modal-card dp-live-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="dp-modal-header dp-live-modal-header">
          <div className="dp-live-modal-title-group">
            <div className="dp-live-modal-badge-row">
              <span className="dp-live-pulse-dot" title="Live status updating in real-time"></span>
              <span className="dp-live-modal-title">Live Academic Operations</span>
              <span className="dp-live-timing-badge">
                <Clock size={13} style={{ marginRight: '5px' }} />
                {currentTime12} • {todayDay}
              </span>
              <span className="dp-live-period-pill">
                {currentPeriod ? `Active Period: ${currentPeriod} (${currentPeriodTiming})` : 'Break / Off-hours'}
              </span>
            </div>
            <p className="dp-live-modal-subtitle">
              Real-time operational status computed from configured period intervals and active timetable assignments.
            </p>
          </div>
          <button
            type="button"
            className="dp-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close view (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONFLICTS ALERT BANNER (If any exist) */}
        {conflicts && conflicts.length > 0 && (
          <div className="dp-live-conflict-banner">
            <div className="dp-conflict-banner-top">
              <AlertTriangle size={18} className="dp-conflict-icon" />
              <strong>Attention: {conflicts.length} Active Scheduling Conflict(s) Detected</strong>
            </div>
            <div className="dp-conflict-banner-list">
              {conflicts.map((conf, idx) => (
                <div key={idx} className="dp-conflict-item">
                  <span className="dp-conflict-badge">{conf.type}</span>
                  <span>{conf.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FIXED HORIZONTAL TAB NAVIGATION BAR */}
        <div className="dp-live-modal-tabs">
          <button
            type="button"
            className={`dp-live-tab-btn ${activeTab === 'LIVE_CLASSES' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('LIVE_CLASSES');
              setSearchFilter('');
            }}
            id="tab-live-classes"
          >
            <Activity size={16} />
            <span>Live Classes</span>
            <span className="dp-tab-count live">{currentlyActiveClasses.length}</span>
          </button>

          <button
            type="button"
            className={`dp-live-tab-btn ${activeTab === 'OCCUPIED_ROOMS' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('OCCUPIED_ROOMS');
              setSearchFilter('');
            }}
            id="tab-occupied-rooms"
          >
            <DoorOpen size={16} />
            <span>Occupied Venues</span>
            <span className="dp-tab-count occupied">{occupiedVenues.length}</span>
          </button>

          <button
            type="button"
            className={`dp-live-tab-btn ${activeTab === 'AVAILABLE_ROOMS' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('AVAILABLE_ROOMS');
              setSearchFilter('');
              setVenueTypeFilter('ALL');
              setVenueAvailabilityFilter('ALL');
            }}
            id="tab-available-rooms"
          >
            <DoorOpen size={16} />
            <span>Available Venues</span>
            <span className="dp-tab-count available">{availableVenues.length}</span>
          </button>

          <button
            type="button"
            className={`dp-live-tab-btn ${activeTab === 'TEACHING_FACULTY' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('TEACHING_FACULTY');
              setSearchFilter('');
            }}
            id="tab-teaching-faculty"
          >
            <Users size={16} />
            <span>Teaching Now</span>
            <span className="dp-tab-count teaching">{teachingFaculty.length}</span>
          </button>

          <button
            type="button"
            className={`dp-live-tab-btn ${activeTab === 'AVAILABLE_FACULTY' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('AVAILABLE_FACULTY');
              setSearchFilter('');
              setFacultyCategoryFilter('ALL');
            }}
            id="tab-available-faculty"
          >
            <UserCheck size={16} />
            <span>Faculty Directory</span>
            <span className="dp-tab-count">{availableFaculty.length}</span>
          </button>
        </div>

        {/* MODAL BODY (SCROLLS VERTICALLY) */}
        <div className="dp-modal-body dp-live-modal-body">
          {/* TAB 1: LIVE CLASSES NOW */}
          {activeTab === 'LIVE_CLASSES' && (
            <div>
              <div className="dp-live-filter-toolbar">
                <div className="dp-live-search-box">
                  <Search size={16} className="dp-live-search-icon" />
                  <input
                    type="text"
                    placeholder="Filter active classes by subject, faculty, section or room..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="dp-live-search-input"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      className="dp-search-clear-btn"
                      onClick={() => setSearchFilter('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {filteredLiveClasses.length > 0 ? (
                <div className="dp-live-cards-list">
                  {filteredLiveClasses.map((item) => {
                    const secSplit = formatAcademicSectionSplit(item.section, item.semester);
                    const roomSplit = formatAcademicRoom(item.room, item.roomType);
                    const timeFormatted = formatTimeRange12h(item.time);

                    return (
                      <div
                        key={item._id}
                        className={`dp-live-item-card ${item.hasConflict ? 'conflict-border' : ''}`}
                        onClick={() => {
                          if (onSelectClass) {
                            onSelectClass(item);
                            onClose();
                          }
                        }}
                        title="Click to view detailed class timetable"
                      >
                        <div className="dp-live-item-top">
                          <div className="dp-live-badges-left">
                            <span className="dp-period-badge">{item.period}</span>
                            <span className="dp-time-text">{timeFormatted}</span>
                            <span className="dp-status-badge live">LIVE NOW</span>
                            {item.minutesRemaining > 0 && (
                              <span className="dp-mins-remaining">
                                {item.minutesRemaining}m remaining
                              </span>
                            )}
                          </div>
                          {item.hasConflict ? (
                            <span className="dp-conflict-tag">
                              <AlertTriangle size={12} /> {item.conflictType || 'CONFLICT'}
                            </span>
                          ) : (
                            <span className="dp-click-action-hint">
                              View Class Details →
                            </span>
                          )}
                        </div>

                        <div className="dp-live-item-title-row">
                          <div className="dp-live-item-subject">{item.subject}</div>
                          {item.subjectCode && (
                            <span className="dp-subject-code">{item.subjectCode}</span>
                          )}
                        </div>

                        <div className="dp-live-details-grid">
                          <div className="dp-live-detail-box">
                            <span className="dp-detail-lbl">Section & Semester</span>
                            <span className="dp-detail-val">
                              {secSplit.program ? `${secSplit.program} — ${secSplit.section}` : secSplit.section}
                              {item.semester ? ` (${item.semester})` : ''}
                            </span>
                          </div>

                          <div className="dp-live-detail-box">
                            <span className="dp-detail-lbl">Assigned Faculty</span>
                            <div className="dp-detail-faculty-val">
                              <span className="dp-detail-val">
                                {formatAcademicFaculty(item.faculty)}
                              </span>
                              {item.isSubstituted && (
                                <span className="dp-badge-substituted">SUBSTITUTED</span>
                              )}
                            </div>
                          </div>

                          <div className="dp-live-detail-box">
                            <span className="dp-detail-lbl">Venue / Room</span>
                            <span className="dp-detail-val">
                              {roomSplit.number}
                              {roomSplit.type && <span className="dp-live-room-type"> ({roomSplit.type})</span>}
                            </span>
                          </div>
                        </div>

                        {item.conflictDescription && (
                          <div className="dp-item-conflict-alert">
                            <AlertCircle size={14} />
                            <span>{item.conflictDescription}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap">
                    <Clock size={36} className="dp-empty-live-icon" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">No Classes Running Now</div>
                    <div className="dp-empty-live-description">
                      There are currently no classes scheduled or in progress during this period.
                      The campus schedule is currently in a transition interval, break, or off-hours.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dp-btn dp-btn-primary dp-btn-sm"
                    onClick={() => {
                      onClose();
                      navigate('/dean/timetable');
                    }}
                  >
                    <span>Inspect Master Timetable</span>
                    <ExternalLink size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OCCUPIED ROOMS */}
          {activeTab === 'OCCUPIED_ROOMS' && (
            <div>
              <div className="dp-live-filter-toolbar">
                <div className="dp-live-search-box">
                  <Search size={16} className="dp-live-search-icon" />
                  <input
                    type="text"
                    placeholder="Filter occupied rooms by venue name, room number, or active class..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="dp-live-search-input"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      className="dp-search-clear-btn"
                      onClick={() => setSearchFilter('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="dp-live-pill-group">
                  {['ALL', 'Classroom', 'Lab', 'Auditorium'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`dp-pill-filter-btn ${venueTypeFilter === t ? 'active' : ''}`}
                      onClick={() => setVenueTypeFilter(t)}
                    >
                      {t === 'ALL' ? 'All Venues' : t === 'Lab' ? 'Laboratories' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>

              {filteredOccupiedVenues.length > 0 ? (
                <div className="dp-live-cards-list">
                  {filteredOccupiedVenues.map((v) => (
                    <div
                      key={v.venueId || v.identifier}
                      className={`dp-live-item-card ${v.hasConflict ? 'conflict-border' : ''}`}
                      onClick={() => {
                        onClose();
                        navigate(`/dean/room-search?room=${encodeURIComponent(v.identifier)}`);
                      }}
                      title="Click to view full room timetable"
                    >
                      <div className="dp-live-item-top">
                        <div className="dp-live-badges-left">
                          <span className="dp-room-identifier-badge">{v.identifier}</span>
                          <span className="dp-room-type-tag">{v.venueType}</span>
                          <span className="dp-status-badge occupied">OCCUPIED</span>
                        </div>
                        <span className="dp-click-action-hint">
                          Inspect Venue Timetable →
                        </span>
                      </div>

                      <div className="dp-venue-title-row">
                        <div className="dp-venue-name">{v.name}</div>
                        <div className="dp-venue-meta">
                          Capacity: <strong>{v.capacity || 60}</strong>
                          {v.floor ? ` • Floor: ${v.floor}` : ''}
                        </div>
                      </div>

                      {v.runningClass && (
                        <div className="dp-venue-running-box">
                          <div className="dp-running-box-header">
                            <Activity size={14} style={{ color: 'var(--dp-danger)' }} />
                            <span>Active Class Running Now:</span>
                            <span className="dp-period-badge sm">{v.runningClass.period}</span>
                            <span className="dp-time-text sm">{v.runningClass.time}</span>
                          </div>
                          <div className="dp-running-details">
                            <div>
                              Subject: <strong>{v.runningClass.subject}</strong>
                              {v.runningClass.subjectCode ? ` (${v.runningClass.subjectCode})` : ''}
                            </div>
                            <div>
                              Section: <strong>{v.runningClass.section}</strong>
                            </div>
                            <div>
                              Faculty: <strong>{formatAcademicFaculty(v.runningClass.faculty)}</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {v.hasConflict && (
                        <div className="dp-item-conflict-alert">
                          <AlertCircle size={14} />
                          <span>
                            Multiple classes concurrently scheduled in this venue ({v.conflictingClasses.length} classes).
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap green">
                    <CheckCircle2 size={36} className="dp-empty-live-icon green" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">All Venues Are Free</div>
                    <div className="dp-empty-live-description">
                      No classrooms, laboratories, or auditoriums are currently occupied by running classes.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: AVAILABLE VENUES (REDESIGNED PROFESSIONAL GRID) */}
          {activeTab === 'AVAILABLE_ROOMS' && (
            <div>
              {/* SEARCH & FILTERS SECTION */}
              <div className="dp-live-filter-toolbar">
                {/* Full-width Search Bar */}
                <div className="dp-live-search-box">
                  <Search size={16} className="dp-live-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by venue name, room number, or venue type..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="dp-live-search-input"
                    id="venue-search-input"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      className="dp-search-clear-btn"
                      onClick={() => setSearchFilter('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Control Rows */}
                <div className="dp-venue-filter-controls-row">
                  {/* Venue Type Pills */}
                  <div className="dp-live-pill-group">
                    <span className="dp-filter-group-label">Type:</span>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn ${venueTypeFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setVenueTypeFilter('ALL')}
                    >
                      All Venues ({venueTypeCounts.all})
                    </button>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn ${venueTypeFilter === 'Classroom' ? 'active' : ''}`}
                      onClick={() => setVenueTypeFilter('Classroom')}
                    >
                      Classrooms ({venueTypeCounts.classroom})
                    </button>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn ${venueTypeFilter === 'Lab' ? 'active' : ''}`}
                      onClick={() => setVenueTypeFilter('Lab')}
                    >
                      Laboratories ({venueTypeCounts.lab})
                    </button>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn ${venueTypeFilter === 'Auditorium' ? 'active' : ''}`}
                      onClick={() => setVenueTypeFilter('Auditorium')}
                    >
                      Auditoriums ({venueTypeCounts.auditorium})
                    </button>
                  </div>

                  {/* Availability Status Toggle Pills */}
                  <div className="dp-live-pill-group">
                    <span className="dp-filter-group-label">Status:</span>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn ${venueAvailabilityFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setVenueAvailabilityFilter('ALL')}
                    >
                      All ({venueStatusCounts.all})
                    </button>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn available ${venueAvailabilityFilter === 'AVAILABLE_NOW' ? 'active' : ''}`}
                      onClick={() => setVenueAvailabilityFilter('AVAILABLE_NOW')}
                    >
                      Available Now ({venueStatusCounts.available})
                    </button>
                    <button
                      type="button"
                      className={`dp-pill-filter-btn occupied ${venueAvailabilityFilter === 'OCCUPIED' ? 'active' : ''}`}
                      onClick={() => setVenueAvailabilityFilter('OCCUPIED')}
                    >
                      Occupied ({venueStatusCounts.occupied})
                    </button>
                  </div>
                </div>
              </div>

              {/* RESPONSIVE VENUE CARD GRID */}
              {filteredVenues.length > 0 ? (
                <div className="dp-venue-card-grid">
                  {filteredVenues.map((v) => {
                    const isOccupied = v.isOccupied;

                    return (
                      <div
                        key={v.venueId || v.identifier}
                        className={`dp-venue-card ${isOccupied ? 'is-occupied' : 'is-available'}`}
                        onClick={() => {
                          onClose();
                          navigate(`/dean/room-search?room=${encodeURIComponent(v.identifier)}`);
                        }}
                        title={`Click to view timetable for ${v.name || v.identifier}`}
                      >
                        {/* Top Row: Identifier, Type Tag, Status Badge */}
                        <div className="dp-venue-card-header">
                          <div className="dp-venue-header-left">
                            <span className="dp-room-identifier-badge">{v.identifier}</span>
                            <span className="dp-room-type-tag">{v.venueType}</span>
                          </div>
                          <span
                            className={`dp-status-badge ${isOccupied ? 'occupied' : 'available'}`}
                          >
                            {isOccupied ? 'OCCUPIED' : 'AVAILABLE NOW'}
                          </span>
                        </div>

                        {/* Middle Section: Name & Capacity / Floor */}
                        <div className="dp-venue-card-body">
                          <div className="dp-venue-name">{v.name}</div>
                          <div className="dp-venue-meta-pills">
                            <span className="dp-venue-meta-pill">
                              Capacity: <strong>{v.capacity || 60}</strong>
                            </span>
                            {v.floor && (
                              <span className="dp-venue-meta-pill">
                                Floor: <strong>{v.floor}</strong>
                              </span>
                            )}
                          </div>

                          {/* Status Description / Current Class Info */}
                          {isOccupied && v.runningClass ? (
                            <div className="dp-venue-occupied-info">
                              <div className="dp-occupied-status-line">
                                <Activity size={13} className="dp-occupied-icon" />
                                <span className="dp-occupied-desc-text">
                                  {v.statusDescription}
                                </span>
                              </div>
                              <div className="dp-occupied-class-details">
                                <div className="dp-occupied-subject-line">
                                  <strong>{v.runningClass.subject}</strong>
                                  {v.runningClass.subjectCode && (
                                    <span className="dp-subject-code-tag">
                                      {v.runningClass.subjectCode}
                                    </span>
                                  )}
                                </div>
                                <div className="dp-occupied-sub-meta">
                                  <span>
                                    Faculty: <strong>{formatAcademicFaculty(v.runningClass.faculty)}</strong>
                                  </span>
                                  <span>
                                    Section: <strong>{v.runningClass.section}</strong>
                                    {v.runningClass.semester ? ` (${v.runningClass.semester})` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="dp-venue-available-info">
                              <div className="dp-available-status-line">
                                <CheckCircle2 size={14} className="dp-avail-check-icon" />
                                <span className="dp-avail-desc-text">
                                  {v.statusDescription || 'Free at current time'}
                                </span>
                              </div>
                              <p className="dp-avail-sub-text">
                                No active class scheduled in this venue for the current period interval.
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Consistent Details Action */}
                        <div className="dp-venue-card-footer">
                          <button
                            type="button"
                            className="dp-venue-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              navigate(`/dean/room-search?room=${encodeURIComponent(v.identifier)}`);
                            }}
                          >
                            <span>View Timetable</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap">
                    <DoorOpen size={36} className="dp-empty-live-icon" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">No Venues Match Selected Filter</div>
                    <div className="dp-empty-live-description">
                      No classrooms, laboratories, or auditoriums matched your search query and filter criteria.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dp-btn dp-btn-secondary dp-btn-sm"
                    onClick={() => {
                      setSearchFilter('');
                      setVenueTypeFilter('ALL');
                      setVenueAvailabilityFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FACULTY TEACHING NOW */}
          {activeTab === 'TEACHING_FACULTY' && (
            <div>
              <div className="dp-live-filter-toolbar">
                <div className="dp-live-search-box">
                  <Search size={16} className="dp-live-search-icon" />
                  <input
                    type="text"
                    placeholder="Filter teaching faculty by name, employee ID, or subject..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="dp-live-search-input"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      className="dp-search-clear-btn"
                      onClick={() => setSearchFilter('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {filteredTeachingFaculty.length > 0 ? (
                <div className="dp-live-cards-list">
                  {filteredTeachingFaculty.map((item) => (
                    <div
                      key={item.facultyId}
                      className={`dp-live-item-card ${item.hasConflict ? 'conflict-border' : ''}`}
                      onClick={() => {
                        onClose();
                        navigate(`/dean/faculty/${item.facultyId}`);
                      }}
                      title="Click to view faculty profile & timetable"
                    >
                      <div className="dp-live-item-top">
                        <div className="dp-live-badges-left">
                          <span className="dp-faculty-id-pill">{item.employeeId}</span>
                          <span className="dp-status-badge teaching">TEACHING NOW</span>
                        </div>
                        <span className="dp-click-action-hint">
                          Inspect Faculty Profile →
                        </span>
                      </div>

                      <div className="dp-faculty-card-header">
                        <div className="dp-faculty-name-main">{item.fullName}</div>
                        <div className="dp-faculty-meta-sub">
                          {item.designation} • {item.department}
                          {item.officialEmail ? ` • ${item.officialEmail}` : ''}
                        </div>
                      </div>

                      {item.currentClass && (
                        <div className="dp-venue-running-box teaching">
                          <div className="dp-running-box-header">
                            <Activity size={14} style={{ color: 'var(--dp-warning)' }} />
                            <span>Currently Teaching:</span>
                            <span className="dp-period-badge sm">{item.currentClass.period}</span>
                            <span className="dp-time-text sm">{item.currentClass.time}</span>
                          </div>
                          <div className="dp-running-details">
                            <div>
                              Subject: <strong>{item.currentClass.subject}</strong>
                              {item.currentClass.subjectCode ? ` (${item.currentClass.subjectCode})` : ''}
                            </div>
                            <div>
                              Class Section: <strong>{item.currentClass.section}</strong>
                            </div>
                            <div>
                              Room: <strong>{item.currentClass.room}</strong>
                              {item.currentClass.roomType ? ` (${item.currentClass.roomType})` : ''}
                            </div>
                          </div>
                        </div>
                      )}

                      {item.hasConflict && (
                        <div className="dp-item-conflict-alert">
                          <AlertCircle size={14} />
                          <span>
                            Faculty assigned to {item.conflictingClasses.length} simultaneous classes.
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap">
                    <Users size={36} className="dp-empty-live-icon" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">No Faculty Currently Teaching</div>
                    <div className="dp-empty-live-description">
                      No faculty members have active teaching assignments in progress at the current time.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: FACULTY DIRECTORY & AVAILABILITY (REDESIGNED PROFESSIONAL GRID) */}
          {activeTab === 'AVAILABLE_FACULTY' && (
            <div>
              {/* SEARCH & FILTERS SECTION */}
              <div className="dp-live-filter-toolbar">
                {/* Full-width Search Bar */}
                <div className="dp-live-search-box">
                  <Search size={16} className="dp-live-search-icon" />
                  <input
                    type="text"
                    placeholder="Search by faculty name, faculty ID, or subject name / code..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="dp-live-search-input"
                    id="faculty-search-input"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      className="dp-search-clear-btn"
                      onClick={() => setSearchFilter('')}
                      aria-label="Clear search"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Status Filter Pills with Synchronized Result Counts */}
                <div className="dp-live-pill-group">
                  <button
                    type="button"
                    className={`dp-pill-filter-btn ${facultyCategoryFilter === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFacultyCategoryFilter('ALL')}
                  >
                    All Faculty ({facultyCounts.all})
                  </button>
                  <button
                    type="button"
                    className={`dp-pill-filter-btn available ${facultyCategoryFilter === 'AVAILABLE_NOW' ? 'active' : ''}`}
                    onClick={() => setFacultyCategoryFilter('AVAILABLE_NOW')}
                  >
                    Available Now ({facultyCounts.available})
                  </button>
                  <button
                    type="button"
                    className={`dp-pill-filter-btn teaching ${facultyCategoryFilter === 'TEACHING_NOW' ? 'active' : ''}`}
                    onClick={() => setFacultyCategoryFilter('TEACHING_NOW')}
                  >
                    Teaching Now ({facultyCounts.teaching})
                  </button>
                  <button
                    type="button"
                    className={`dp-pill-filter-btn not-scheduled ${facultyCategoryFilter === 'NOT_SCHEDULED_TODAY' ? 'active' : ''}`}
                    onClick={() => setFacultyCategoryFilter('NOT_SCHEDULED_TODAY')}
                  >
                    Not Scheduled Today ({facultyCounts.notScheduled})
                  </button>
                  {facultyCounts.unknown > 0 && (
                    <button
                      type="button"
                      className={`dp-pill-filter-btn unknown ${facultyCategoryFilter === 'STATUS_UNKNOWN' ? 'active' : ''}`}
                      onClick={() => setFacultyCategoryFilter('STATUS_UNKNOWN')}
                    >
                      Status Unknown ({facultyCounts.unknown})
                    </button>
                  )}
                </div>
              </div>

              {/* RESPONSIVE FACULTY CARD GRID */}
              {filteredFaculty.length > 0 ? (
                <div className="dp-faculty-card-grid">
                  {filteredFaculty.map((item) => {
                    const isAvailableNow = item.category === 'AVAILABLE_NOW';
                    const isTeachingNow = item.category === 'TEACHING_NOW';
                    const isNotScheduled = item.category === 'NOT_SCHEDULED_TODAY';
                    const isUnknown = item.category === 'STATUS_UNKNOWN';

                    return (
                      <div
                        key={item.facultyId}
                        className="dp-faculty-card"
                        onClick={() => {
                          onClose();
                          navigate(`/dean/faculty/${item.facultyId}`);
                        }}
                        title={`Click to view profile and full timetable for ${item.fullName}`}
                      >
                        {/* Header: Faculty Name, Employee ID & Current Status Badge */}
                        <div className="dp-faculty-card-top">
                          <div className="dp-faculty-identity">
                            <div className="dp-faculty-name-main">{item.fullName}</div>
                            <span className="dp-faculty-id-pill">{item.employeeId}</span>
                          </div>
                          <span
                            className={`dp-status-badge ${
                              isAvailableNow
                                ? 'available'
                                : isTeachingNow
                                ? 'teaching'
                                : isNotScheduled
                                ? 'not-scheduled'
                                : 'unknown'
                            }`}
                          >
                            {item.statusLabel}
                          </span>
                        </div>

                        {/* Designation, Department & Email */}
                        <div className="dp-faculty-meta-row">
                          <span className="dp-faculty-dept-text">
                            {item.designation} • {item.department}
                          </span>
                          {item.officialEmail && (
                            <span className="dp-faculty-email-text" title={item.officialEmail}>
                              <Mail size={12} className="dp-faculty-email-icon" />
                              {item.officialEmail}
                            </span>
                          )}
                        </div>

                        {/* Distinct Active Assignment / Status Section */}
                        <div className="dp-faculty-card-body-section">
                          {/* 1. TEACHING NOW: Distinct readable assignment box */}
                          {isTeachingNow && item.currentClass && (
                            <div className="dp-faculty-teaching-box">
                              <div className="dp-teaching-box-header">
                                <Activity size={14} className="dp-teaching-icon" />
                                <span className="dp-teaching-box-title">Active Teaching Assignment</span>
                                <span className="dp-period-badge sm">{item.currentClass.period}</span>
                                <span className="dp-time-text sm">
                                  {formatTimeRange12h(item.currentClass.time)}
                                </span>
                              </div>

                              <div className="dp-teaching-box-subject-row">
                                <span className="dp-teaching-subject-name">
                                  {item.currentClass.subject}
                                </span>
                                {item.currentClass.subjectCode && (
                                  <span className="dp-subject-code-tag">
                                    {item.currentClass.subjectCode}
                                  </span>
                                )}
                              </div>

                              <div className="dp-teaching-meta-grid">
                                <div className="dp-teaching-meta-item">
                                  <span className="dp-meta-lbl">Venue</span>
                                  <span className="dp-meta-val">
                                    {item.currentClass.room}
                                    {item.currentClass.roomType && ` (${item.currentClass.roomType})`}
                                  </span>
                                </div>
                                <div className="dp-teaching-meta-item">
                                  <span className="dp-meta-lbl">Section & Semester</span>
                                  <span className="dp-meta-val">
                                    {item.currentClass.section}
                                    {item.currentClass.semester ? ` (${item.currentClass.semester})` : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. AVAILABLE NOW */}
                          {isAvailableNow && (
                            <div className="dp-faculty-status-box available">
                              <div className="dp-faculty-box-header">
                                <CheckCircle2 size={15} style={{ color: '#059669' }} />
                                <span className="dp-faculty-box-title">Free at current time</span>
                              </div>
                              <p className="dp-faculty-box-desc">
                                {item.statusNote || 'Scheduled for classes today; currently free between academic periods.'}
                              </p>
                            </div>
                          )}

                          {/* 3. NOT SCHEDULED TODAY */}
                          {isNotScheduled && (
                            <div className="dp-faculty-status-box not-scheduled">
                              <div className="dp-faculty-box-header">
                                <Calendar size={15} style={{ color: '#2563EB' }} />
                                <span className="dp-faculty-box-title">No classes scheduled today</span>
                              </div>
                              <p className="dp-faculty-box-desc">
                                No teaching assignments or lecture duties scheduled for this faculty member on this day.
                              </p>
                            </div>
                          )}

                          {/* 4. STATUS UNKNOWN / UNAVAILABLE DATA */}
                          {isUnknown && (
                            <div className="dp-faculty-status-box unknown">
                              <div className="dp-faculty-box-header">
                                <HelpCircle size={15} style={{ color: '#64748B' }} />
                                <span className="dp-faculty-box-title">Status Unknown</span>
                              </div>
                              <p className="dp-faculty-box-desc">
                                {item.reason || 'Faculty account inactive, on official leave, or profile data incomplete.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Card Action Footer: View Profile */}
                        <div className="dp-faculty-card-footer">
                          <button
                            type="button"
                            className="dp-faculty-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              navigate(`/dean/faculty/${item.facultyId}`);
                            }}
                          >
                            <span>View Profile</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap">
                    <UserCheck size={36} className="dp-empty-live-icon" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">No Faculty Match Selected Filter</div>
                    <div className="dp-empty-live-description">
                      Try clearing the search query or selecting a different status filter pill.
                    </div>
                  </div>
                  <button
                    type="button"
                    className="dp-btn dp-btn-secondary dp-btn-sm"
                    onClick={() => {
                      setSearchFilter('');
                      setFacultyCategoryFilter('ALL');
                    }}
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="dp-modal-footer">
          <div className="dp-live-modal-footer-stats">
            <span>Live Classes: <strong>{liveStats.classesRunningNow ?? 0}</strong></span>
            <span>Occupied Venues: <strong>{liveStats.occupiedRooms ?? 0}</strong></span>
            <span>Available Venues: <strong>{liveStats.freeRooms ?? 0}</strong></span>
            <span>Teaching Now: <strong>{liveStats.facultyInClass ?? 0}</strong></span>
            <span>Available Faculty: <strong>{liveStats.freeFaculty ?? 0}</strong></span>
          </div>
          <button
            type="button"
            className="dp-btn dp-btn-outline dp-btn-sm"
            onClick={onClose}
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveAcademicStatusModal;
