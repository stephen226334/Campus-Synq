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
  ExternalLink
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import { parseTimeToMinutes } from '../../utils/timetableSort';

export const DeanRoomSearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoom = searchParams.get('room') || 'B314';
  const initialDay = searchParams.get('day') || 'Monday';

  const [room, setRoom] = useState(initialRoom);
  const [day, setDay] = useState(initialDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const commonRooms = ['B314', 'B315', 'CS-101', 'CS-201', 'LAB-01', 'B201', 'B205', 'C201'];

  const executeSearch = async (targetRoom = room, targetDay = day) => {
    try {
      setLoading(true);
      const res = await deanApi.getRoomWiseSearch({
        room: targetRoom,
        day: targetDay
      });
      if (res?.data && Array.isArray(res.data.timetable)) {
        res.data.timetable.sort((a, b) => {
          const startA = parseTimeToMinutes(a.time ? a.time.split('-')[0].trim() : '');
          const startB = parseTimeToMinutes(b.time ? b.time.split('-')[0].trim() : '');
          return startA - startB;
        });
      }
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to retrieve room timetable', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(initialRoom, initialDay);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ room, day });
    executeSearch();
  };

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <DoorOpen size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Room Search</h1>
            <p className="dp-page-subtitle">
              View the complete timetable for a classroom.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Form */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-room-search-grid" noValidate={false}>
          {/* 1. Room Selection Column (40%) */}
          <div className="dp-form-field dp-room-field">
            <label htmlFor="room-select" className="dp-form-label">Room</label>
            <div className="dp-form-input-wrapper">
              <DoorOpen size={18} className="dp-form-icon" />
              <input
                id="room-select"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. B314, CS-101"
                className="dp-room-input"
                required
                autoComplete="off"
              />
            </div>
            <div className="dp-quick-tags" aria-label="Suggested Rooms">
              {commonRooms.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`dp-quick-tag ${room === r ? 'active' : ''}`}
                  onClick={() => setRoom(r)}
                  aria-pressed={room === r}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Day Selection Column (30%) */}
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

          {/* 3. Action Button Column (30%) */}
          <div className="dp-form-field dp-action-field">
            <label className="dp-form-label dp-label-spacer" aria-hidden="true">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-view-timetable"
              disabled={loading}
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
            <div className="dp-room-table-header">
              <div className="dp-room-title-meta">
                <h2 className="dp-room-title-heading">Room {data.room?.roomNumber}</h2>
                <div className="dp-room-subtitle-meta">
                  <span className="dp-room-day-name">{data.day}</span>
                  <span className="dp-room-sep" aria-hidden="true">·</span>
                  <span className="dp-room-capacity-info">Capacity: {data.room?.capacity || 60} seats</span>
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
                      inspectEntity({
                        category: 'CLASSROOM',
                        id: data.room?._id || data.room?.roomNumber,
                        title: `Room ${data.room?.roomNumber}`,
                        details: data.room
                      });
                    }
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <ExternalLink size={14} />
                  <span>View Room Details</span>
                </button>
              </div>
            </div>

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
                        No timetable records found for Room {data.room?.roomNumber} on {data.day}.
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
        ) : null}
      </div>
    </div>
  );
};

export default DeanRoomSearchPage;
