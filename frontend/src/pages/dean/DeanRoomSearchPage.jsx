import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  DoorOpen, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  BookOpen, 
  Layers, 
  CheckCircle, 
  AlertCircle,
  ExternalLink,
  Building,
  FlaskConical,
  Tv
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import { parseTimeToMinutes } from '../../utils/timetableSort';
import SearchableDropdown from '../../components/common/SearchableDropdown';

export const DeanRoomSearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();

  const [venues, setVenues] = useState([]);
  const [loadingVenues, setLoadingVenues] = useState(true);
  const [venuesError, setVenuesError] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('ALL'); // ALL, Classroom, Lab, Auditorium

  const initialRoomParam = searchParams.get('room') || '';
  const initialDayParam = searchParams.get('day') || 'Monday';

  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [day, setDay] = useState(initialDayParam);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { showToast } = useToast();

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // 1. Fetch Classrooms, Labs, and Auditoriums dynamically from database
  useEffect(() => {
    const fetchAllVenues = async () => {
      try {
        setLoadingVenues(true);
        setVenuesError(null);

        const [classroomsRes, labsRes, audsRes] = await Promise.all([
          deanApi.getClassroomList(),
          deanApi.getLabList(),
          deanApi.getAuditoriumList()
        ]);

        const allVenuesList = [];

        // Add classrooms
        (classroomsRes.data || []).forEach((c) => {
          allVenuesList.push({
            _id: c._id,
            roomNumber: c.roomNumber,
            name: c.name || `Room ${c.roomNumber}`,
            venueType: 'Classroom',
            group: 'Classrooms',
            capacity: c.capacity,
            floor: c.floor,
            raw: c
          });
        });

        // Add labs
        (labsRes.data || []).forEach((l) => {
          allVenuesList.push({
            _id: l._id,
            roomNumber: l.labNumber,
            name: l.labName || `Lab ${l.labNumber}`,
            venueType: 'Lab',
            group: 'Laboratories',
            capacity: l.capacity,
            floor: l.floor,
            raw: l
          });
        });

        // Add auditoriums
        (audsRes.data || []).forEach((a) => {
          allVenuesList.push({
            _id: a._id,
            roomNumber: a.auditoriumNumber || a.name,
            name: a.name || a.auditoriumName || `Auditorium ${a.auditoriumNumber}`,
            venueType: 'Auditorium',
            group: 'Auditoriums',
            capacity: a.capacity,
            floor: a.floor,
            raw: a
          });
        });

        setVenues(allVenuesList);

        if (allVenuesList.length > 0) {
          let matched = null;
          if (initialRoomParam) {
            matched = allVenuesList.find(
              (v) =>
                v._id === initialRoomParam ||
                v.roomNumber?.toLowerCase() === initialRoomParam.toLowerCase() ||
                v.name?.toLowerCase().includes(initialRoomParam.toLowerCase())
            );
          }
          const defaultVenue = matched || allVenuesList[0];
          setSelectedVenueId(defaultVenue._id);
        }
      } catch (err) {
        console.error('Failed to load venue directories:', err);
        setVenuesError('Unable to load venue directories from server');
      } finally {
        setLoadingVenues(false);
      }
    };

    fetchAllVenues();
  }, []);

  // Filter venues by category tab if active
  const filteredVenues = React.useMemo(() => {
    if (categoryFilter === 'ALL') return venues;
    return venues.filter((v) => v.venueType === categoryFilter);
  }, [venues, categoryFilter]);

  // Format venue options for SearchableDropdown
  const venueOptions = React.useMemo(() => {
    return filteredVenues.map((v) => ({
      value: v._id,
      label: `${v.roomNumber}${v.name && v.name !== v.roomNumber ? ` — ${v.name}` : ''}`,
      subLabel: `${v.venueType} • Capacity: ${v.capacity || 60} seats${v.floor ? ` • Floor ${v.floor}` : ''}`,
      badge: v.venueType,
      group: v.group,
      searchTerms: `${v.roomNumber} ${v.name} ${v.venueType} ${v.group}`,
      raw: v
    }));
  }, [filteredVenues]);

  // Execute room-wise search
  const executeSearch = async (targetVenueId = selectedVenueId, targetDay = day) => {
    if (!targetVenueId) return;

    try {
      setLoading(true);
      setSearched(true);

      const targetVenue = venues.find((v) => v._id === targetVenueId);
      const res = await deanApi.getRoomWiseSearch({
        room: targetVenue ? targetVenue.roomNumber : targetVenueId,
        roomId: targetVenueId,
        day: targetDay
      });

      if (res?.data && Array.isArray(res.data.timetable)) {
        res.data.timetable.sort((a, b) => {
          const startA = parseTimeToMinutes(a.time ? a.time.split('-')[0].trim() : '');
          const startB = parseTimeToMinutes(b.time ? b.time.split('-')[0].trim() : '');
          return startA - startB;
        });
      }

      // If backend returned room meta, merge with target venue details
      if (res?.data && targetVenue) {
        res.data.room = {
          ...res.data.room,
          venueType: targetVenue.venueType,
          name: targetVenue.name,
          capacity: res.data.room?.capacity || targetVenue.capacity
        };
      }

      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to retrieve venue timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run search when default venue is initialized
  useEffect(() => {
    if (selectedVenueId && !searched) {
      executeSearch(selectedVenueId, day);
    }
  }, [selectedVenueId]);

  // React to URL search param updates while mounted
  useEffect(() => {
    const urlRoom = searchParams.get('room');
    const urlDay = searchParams.get('day');

    if (urlDay && urlDay !== day) setDay(urlDay);

    if (urlRoom && venues.length > 0) {
      const matched = venues.find(
        (v) =>
          v._id === urlRoom ||
          v.roomNumber?.toLowerCase() === urlRoom.toLowerCase() ||
          v.name?.toLowerCase().includes(urlRoom.toLowerCase())
      );
      if (matched && matched._id !== selectedVenueId) {
        setSelectedVenueId(matched._id);
        executeSearch(matched._id, urlDay || day);
      }
    }
  }, [searchParams, venues]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedVenueId) {
      showToast('Please select a venue to search', 'warning');
      return;
    }
    const currentVenue = venues.find((v) => v._id === selectedVenueId);
    setSearchParams({
      room: currentVenue ? currentVenue.roomNumber : selectedVenueId,
      day
    });
    executeSearch();
  };

  const selectedVenueDoc = venues.find((v) => v._id === selectedVenueId);

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <DoorOpen size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Room & Venue Search</h1>
            <p className="dp-page-subtitle">
              View the complete timetable and occupancy status for classrooms, laboratories, and auditoriums.
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
        {[
          { key: 'ALL', label: 'All Venues', count: venues.length },
          { key: 'Classroom', label: 'Classrooms', count: venues.filter((v) => v.venueType === 'Classroom').length },
          { key: 'Lab', label: 'Laboratories', count: venues.filter((v) => v.venueType === 'Lab').length },
          { key: 'Auditorium', label: 'Auditoriums', count: venues.filter((v) => v.venueType === 'Auditorium').length }
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`dp-quick-tag ${categoryFilter === tab.key ? 'active' : ''}`}
            onClick={() => setCategoryFilter(tab.key)}
            style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 600, borderRadius: '20px' }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Search Filter Form */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-room-search-grid" noValidate={false}>
          {/* 1. Dynamic Venue Dropdown */}
          <div className="dp-form-field dp-room-field">
            <SearchableDropdown
              id="room-select"
              label="Select Room or Venue"
              options={venueOptions}
              value={selectedVenueId}
              onChange={(val) => {
                setSelectedVenueId(val);
                if (val) executeSearch(val, day);
              }}
              placeholder="Search classroom, lab, auditorium..."
              loading={loadingVenues}
              loadingText="Loading venues..."
              error={venuesError}
              icon={DoorOpen}
              required
            />
          </div>

          {/* 2. Day Selection */}
          <div className="dp-form-field dp-day-field">
            <label htmlFor="day-select" className="dp-form-label">Day</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={18} className="dp-form-icon" />
              <select
                id="day-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="dp-day-select"
              >
                {daysList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. Action Button */}
          <div className="dp-form-field dp-action-field">
            <label className="dp-form-label dp-label-spacer" aria-hidden="true">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-view-timetable"
              disabled={loading || loadingVenues}
              aria-label="View Room Timetable"
            >
              <Search size={18} className="dp-btn-search-icon" />
              <span className="dp-btn-search-text">{loading ? 'Loading...' : 'View Timetable'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Timetable Table Output */}
      <div className="dp-room-output-section">
        {loading ? (
          <div className="dp-loading-card">
            <div className="dp-skeleton-line" style={{ width: '50%', height: '22px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '100%', height: '140px', marginTop: '16px' }}></div>
          </div>
        ) : data ? (
          <div className="dp-room-table-card">
            {/* Table Header Meta */}
            <div className="dp-room-table-header">
              <div className="dp-room-title-meta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="dp-period-badge">
                    {data.room?.venueType || selectedVenueDoc?.venueType || 'VENUE'}
                  </span>
                  <h2 className="dp-room-title-heading" style={{ margin: 0 }}>
                    {data.room?.roomNumber ? `${data.room.roomNumber}` : 'Venue'}
                    {data.room?.name && data.room.name !== data.room.roomNumber ? ` — ${data.room.name}` : ''}
                  </h2>
                </div>
                <div className="dp-room-subtitle-meta">
                  <span className="dp-room-day-name">{data.day}</span>
                  <span className="dp-room-sep" aria-hidden="true">·</span>
                  <span className="dp-room-capacity-info">
                    Capacity: {data.room?.capacity || selectedVenueDoc?.capacity || 60} seats
                  </span>
                  {data.room?.floor && (
                    <>
                      <span className="dp-room-sep" aria-hidden="true">·</span>
                      <span>Floor {data.room.floor}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="dp-room-header-controls">
                <div className="dp-room-stats-summary">
                  <span className="dp-summary-chip occupied">
                    Occupied: {data.timetable?.filter((t) => t.status === 'OCCUPIED').length || 0}
                  </span>
                  <span className="dp-summary-chip free">
                    Free: {data.timetable?.filter((t) => t.status === 'FREE').length || 0}
                  </span>
                </div>
                <button
                  type="button"
                  className="dp-btn-secondary"
                  onClick={() => {
                    if (inspectEntity) {
                      const category = (data.room?.venueType || selectedVenueDoc?.venueType || 'CLASSROOM').toUpperCase();
                      inspectEntity({
                        category: category === 'LAB' ? 'LAB' : (category === 'AUDITORIUM' ? 'AUDITORIUM' : 'CLASSROOM'),
                        id: data.room?._id || selectedVenueDoc?._id,
                        title: `${data.room?.venueType || 'Venue'} ${data.room?.roomNumber || selectedVenueDoc?.roomNumber}`,
                        details: data.room || selectedVenueDoc
                      });
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} />
                  <span>View Venue Details</span>
                </button>
              </div>
            </div>

            {/* Timetable Table */}
            <div className="dp-table-container">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>PERIOD</th>
                    <th>TIME</th>
                    <th>CLASS / SECTION</th>
                    <th>SUBJECT</th>
                    <th>FACULTY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(!data.timetable || data.timetable.length === 0) ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--dp-secondary)' }}>
                        No timetable records found for {data.room?.roomNumber} on {data.day}.
                      </td>
                    </tr>
                  ) : (
                    data.timetable.map((row) => (
                      <tr
                        key={row.periodId || row.period}
                        className={row.status === 'OCCUPIED' ? 'dp-row-occupied' : 'dp-row-free'}
                      >
                        <td className="dp-td-period">
                          <span className="dp-period-badge">{row.period}</span>
                        </td>
                        <td className="dp-td-time">
                          <span className="dp-time-text">{row.time}</span>
                        </td>
                        <td className="dp-td-class">
                          {row.className && row.className !== '—' ? (
                            <strong>{formatAcademicSection(row.className)}</strong>
                          ) : (
                            <span className="dp-text-muted">—</span>
                          )}
                        </td>
                        <td className="dp-td-subject">
                          {row.subject && row.subject !== '—' ? (
                            <div className="dp-subject-cell">
                              <span>{row.subject}</span>
                              {row.subjectCode && <span className="dp-code-chip">{row.subjectCode}</span>}
                            </div>
                          ) : (
                            <span className="dp-text-muted">—</span>
                          )}
                        </td>
                        <td className="dp-td-faculty">
                          {row.faculty && row.faculty !== '—' ? (
                            <span className="dp-faculty-text">{row.faculty}</span>
                          ) : (
                            <span className="dp-text-muted">—</span>
                          )}
                        </td>
                        <td className="dp-td-status">
                          <span className={`dp-status-badge ${row.status?.toLowerCase() || 'free'}`}>
                            <span className={`dp-status-dot ${row.status === 'OCCUPIED' ? 'red' : 'green'}`}></span>
                            <span>{row.status || 'FREE'}</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : searched ? (
          <div className="dp-empty-card">
            <AlertCircle size={28} />
            <p>No records found for the selected venue.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeanRoomSearchPage;
