import React, { useState, useMemo } from 'react';
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
  ShieldAlert,
  Layers,
  HelpCircle,
  AlertCircle
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
  const [facultyCategoryFilter, setFacultyCategoryFilter] = useState('ALL');
  const [venueTypeFilter, setVenueTypeFilter] = useState('ALL');

  // Keep active tab in sync when initialTab changes
  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
    setSearchFilter('');
  }, [initialTab, isOpen]);

  if (!isOpen || !dashboardData) return null;

  const {
    liveStats = {},
    currentlyActiveClasses = [],
    occupiedVenues = [],
    availableVenues = [],
    teachingFaculty = [],
    availableFaculty = [],
    conflicts = [],
    currentAcademicContext = {}
  } = dashboardData;

  const currentPeriod = currentAcademicContext.currentPeriod;
  const currentPeriodTiming = currentAcademicContext.currentPeriodTiming;
  const currentTime12 = currentAcademicContext.currentTime12;
  const todayDay = currentAcademicContext.todayDay;

  // Filtered live classes
  const filteredLiveClasses = currentlyActiveClasses.filter(c => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (c.subject && c.subject.toLowerCase().includes(q)) ||
      (c.subjectCode && c.subjectCode.toLowerCase().includes(q)) ||
      (c.faculty && c.faculty.toLowerCase().includes(q)) ||
      (c.section && c.section.toLowerCase().includes(q)) ||
      (c.room && c.room.toLowerCase().includes(q))
    );
  });

  // Filtered occupied venues
  const filteredOccupiedVenues = occupiedVenues.filter(v => {
    if (venueTypeFilter !== 'ALL' && v.venueType.toLowerCase() !== venueTypeFilter.toLowerCase()) {
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

  // Filtered available venues
  const filteredAvailableVenues = availableVenues.filter(v => {
    if (venueTypeFilter !== 'ALL' && v.venueType.toLowerCase() !== venueTypeFilter.toLowerCase()) {
      return false;
    }
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (v.identifier && v.identifier.toLowerCase().includes(q)) ||
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.venueType && v.venueType.toLowerCase().includes(q))
    );
  });

  // Filtered faculty
  const filteredFaculty = availableFaculty.filter(f => {
    if (facultyCategoryFilter !== 'ALL' && f.category !== facultyCategoryFilter) {
      return false;
    }
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (f.fullName && f.fullName.toLowerCase().includes(q)) ||
      (f.employeeId && f.employeeId.toLowerCase().includes(q)) ||
      (f.designation && f.designation.toLowerCase().includes(q)) ||
      (f.department && f.department.toLowerCase().includes(q)) ||
      (f.currentClass?.subject && f.currentClass.subject.toLowerCase().includes(q))
    );
  });

  const availableNowCount = availableFaculty.filter(f => f.category === 'AVAILABLE_NOW').length;
  const teachingNowCount = teachingFaculty.length;
  const notScheduledCount = availableFaculty.filter(f => f.category === 'NOT_SCHEDULED_TODAY').length;
  const unknownCount = availableFaculty.filter(f => f.category === 'STATUS_UNKNOWN').length;

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
              <span className="dp-live-pulse-dot"></span>
              <span className="dp-live-modal-title">Live Academic Operations</span>
              <span className="dp-live-timing-badge">
                <Clock size={13} style={{ marginRight: '4px' }} />
                {currentTime12} • {todayDay}
              </span>
              <span className="dp-live-period-pill">
                {currentPeriod ? `Period: ${currentPeriod} (${currentPeriodTiming})` : 'Break / Off-hours'}
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

        {/* TAB NAVIGATION BAR */}
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
            }}
            id="tab-available-faculty"
          >
            <UserCheck size={16} />
            <span>Faculty Directory</span>
            <span className="dp-tab-count">{availableFaculty.length}</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="dp-modal-body dp-live-modal-body">
          {/* SEARCH & FILTER CONTROLS */}
          <div className="dp-live-filter-toolbar">
            <div className="dp-live-search-box">
              <Search size={16} className="dp-live-search-icon" />
              <input
                type="text"
                placeholder={
                  activeTab === 'LIVE_CLASSES'
                    ? 'Filter by subject, faculty, section or room...'
                    : activeTab === 'OCCUPIED_ROOMS' || activeTab === 'AVAILABLE_ROOMS'
                    ? 'Filter by venue name, room number or type...'
                    : 'Filter by faculty name, ID, or subject...'
                }
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="dp-live-search-input"
              />
              {searchFilter && (
                <button
                  type="button"
                  className="dp-search-clear-btn"
                  onClick={() => setSearchFilter('')}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sub-filters for Venues */}
            {(activeTab === 'OCCUPIED_ROOMS' || activeTab === 'AVAILABLE_ROOMS') && (
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
            )}

            {/* Sub-filters for Faculty Directory */}
            {activeTab === 'AVAILABLE_FACULTY' && (
              <div className="dp-live-pill-group">
                <button
                  type="button"
                  className={`dp-pill-filter-btn ${facultyCategoryFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setFacultyCategoryFilter('ALL')}
                >
                  All ({availableFaculty.length})
                </button>
                <button
                  type="button"
                  className={`dp-pill-filter-btn available ${facultyCategoryFilter === 'AVAILABLE_NOW' ? 'active' : ''}`}
                  onClick={() => setFacultyCategoryFilter('AVAILABLE_NOW')}
                >
                  Available Now ({availableNowCount})
                </button>
                <button
                  type="button"
                  className={`dp-pill-filter-btn teaching ${facultyCategoryFilter === 'TEACHING_NOW' ? 'active' : ''}`}
                  onClick={() => setFacultyCategoryFilter('TEACHING_NOW')}
                >
                  Teaching Now ({teachingNowCount})
                </button>
                <button
                  type="button"
                  className={`dp-pill-filter-btn not-scheduled ${facultyCategoryFilter === 'NOT_SCHEDULED_TODAY' ? 'active' : ''}`}
                  onClick={() => setFacultyCategoryFilter('NOT_SCHEDULED_TODAY')}
                >
                  Not Scheduled Today ({notScheduledCount})
                </button>
                {unknownCount > 0 && (
                  <button
                    type="button"
                    className={`dp-pill-filter-btn unknown ${facultyCategoryFilter === 'STATUS_UNKNOWN' ? 'active' : ''}`}
                    onClick={() => setFacultyCategoryFilter('STATUS_UNKNOWN')}
                  >
                    Status Unknown ({unknownCount})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TAB 1: LIVE CLASSES NOW */}
          {activeTab === 'LIVE_CLASSES' && (
            <div>
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
              {filteredOccupiedVenues.length > 0 ? (
                <div className="dp-live-cards-list">
                  {filteredOccupiedVenues.map((v) => (
                    <div
                      key={v.venueId}
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
                          Capacity: <strong>{v.capacity}</strong>
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

          {/* TAB 3: AVAILABLE ROOMS */}
          {activeTab === 'AVAILABLE_ROOMS' && (
            <div>
              {filteredAvailableVenues.length > 0 ? (
                <div className="dp-venue-grid-display">
                  {filteredAvailableVenues.map((v) => (
                    <div
                      key={v.venueId}
                      className="dp-available-venue-card"
                      onClick={() => {
                        onClose();
                        navigate(`/dean/room-search?room=${encodeURIComponent(v.identifier)}`);
                      }}
                      title="Click to view venue schedule"
                    >
                      <div className="dp-avail-card-top">
                        <span className="dp-room-identifier-badge">{v.identifier}</span>
                        <span className="dp-status-badge available">AVAILABLE NOW</span>
                      </div>
                      <div className="dp-avail-venue-name">{v.name}</div>
                      <div className="dp-avail-venue-meta">
                        <span>Type: <strong>{v.venueType}</strong></span>
                        <span>Capacity: <strong>{v.capacity}</strong></span>
                        {v.floor && <span>Floor: <strong>{v.floor}</strong></span>}
                      </div>
                      <div className="dp-avail-card-footer">
                        <span>Free at current time</span>
                        <ChevronRight size={14} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dp-empty-live-box">
                  <div className="dp-empty-live-icon-wrap red">
                    <DoorOpen size={36} className="dp-empty-live-icon red" />
                  </div>
                  <div className="dp-empty-live-text-wrap">
                    <div className="dp-empty-live-heading">No Free Venues Match Filter</div>
                    <div className="dp-empty-live-description">
                      All matching classrooms, labs, and auditoriums are currently occupied by classes.
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: FACULTY TEACHING NOW */}
          {activeTab === 'TEACHING_FACULTY' && (
            <div>
              {teachingFaculty.length > 0 ? (
                <div className="dp-live-cards-list">
                  {teachingFaculty.map((item) => (
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

          {/* TAB 5: FACULTY DIRECTORY & AVAILABILITY (4 Categories) */}
          {activeTab === 'AVAILABLE_FACULTY' && (
            <div>
              {filteredFaculty.length > 0 ? (
                <div className="dp-live-cards-list">
                  {filteredFaculty.map((item) => {
                    const isAvailableNow = item.category === 'AVAILABLE_NOW';
                    const isTeachingNow = item.category === 'TEACHING_NOW';
                    const isNotScheduled = item.category === 'NOT_SCHEDULED_TODAY';
                    const isUnknown = item.category === 'STATUS_UNKNOWN';

                    return (
                      <div
                        key={item.facultyId}
                        className="dp-live-item-card"
                        onClick={() => {
                          onClose();
                          navigate(`/dean/faculty/${item.facultyId}`);
                        }}
                        title="Click to view faculty details"
                      >
                        <div className="dp-live-item-top">
                          <div className="dp-live-badges-left">
                            <span className="dp-faculty-id-pill">{item.employeeId}</span>
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
                          <span className="dp-click-action-hint">
                            View Profile →
                          </span>
                        </div>

                        <div className="dp-faculty-card-header">
                          <div className="dp-faculty-name-main">{item.fullName}</div>
                          <div className="dp-faculty-meta-sub">
                            {item.designation} • {item.department}
                            {item.officialEmail ? ` • ${item.officialEmail}` : ''}
                          </div>
                        </div>

                        {/* Category Details */}
                        {isAvailableNow && (
                          <div className="dp-faculty-status-note available">
                            <CheckCircle2 size={15} />
                            <span>
                              {item.statusNote || 'Available now (has scheduled classes today, currently free)'}
                            </span>
                          </div>
                        )}

                        {isTeachingNow && item.currentClass && (
                          <div className="dp-venue-running-box teaching">
                            <div className="dp-running-box-header">
                              <Activity size={14} style={{ color: 'var(--dp-warning)' }} />
                              <span>Teaching: <strong>{item.currentClass.subject}</strong></span>
                              <span className="dp-period-badge sm">{item.currentClass.period}</span>
                              <span className="dp-time-text sm">{item.currentClass.time}</span>
                            </div>
                            <div className="dp-running-details">
                              <div>Room: <strong>{item.currentClass.room}</strong></div>
                              <div>Section: <strong>{item.currentClass.section}</strong></div>
                            </div>
                          </div>
                        )}

                        {isNotScheduled && (
                          <div className="dp-faculty-status-note not-scheduled">
                            <Calendar size={15} />
                            <span>No classes scheduled on this day.</span>
                          </div>
                        )}

                        {isUnknown && (
                          <div className="dp-faculty-status-note unknown">
                            <HelpCircle size={15} />
                            <span>Status Unknown: {item.reason || 'Missing or invalid data'}</span>
                          </div>
                        )}
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
                      Try selecting a different filter pill or clearing the search query.
                    </div>
                  </div>
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
