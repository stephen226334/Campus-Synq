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
        <form onSubmit={handleSubmit} className="dp-room-search-grid">
          <div className="dp-form-field">
            <label htmlFor="room-select">Room</label>
            <div className="dp-form-input-wrapper">
              <DoorOpen size={16} className="dp-form-icon" />
              <input
                id="room-select"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. B314, CS-101"
                required
              />
            </div>
            <div className="dp-quick-tags">
              {commonRooms.map((r) => (
                <button
                  type="button"
                  key={r}
                  className={`dp-quick-tag ${room === r ? 'active' : ''}`}
                  onClick={() => setRoom(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="dp-form-field">
            <label htmlFor="day-select">Day</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={16} className="dp-form-icon" />
              <select
                id="day-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {daysList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dp-form-field dp-form-actions">
            <label>&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-primary dp-btn-search"
              disabled={loading}
            >
              <Search size={16} />
              <span>{loading ? 'Loading...' : 'View Timetable'}</span>
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
                <span className="dp-room-tag">ROOM {data.room?.roomNumber}</span>
                <span className="dp-room-day-label">{data.room?.roomNumber} — {data.day} Timetable</span>
                <span className="dp-room-cap-chip">Capacity: {data.room?.capacity} seats</span>
              </div>
              <div className="dp-room-stats-summary">
                <span className="dp-summary-chip occupied">
                  Occupied: {data.timetable?.filter((t) => t.status === 'OCCUPIED').length}
                </span>
                <span className="dp-summary-chip free">
                  Free: {data.timetable?.filter((t) => t.status === 'FREE').length}
                </span>
              </div>
            </div>

            <div className="dp-table-container">
              <table className="dp-table">
                <thead>
                  <tr>
                    <th>PERIOD</th>
                    <th>TIME</th>
                    <th>CLASS</th>
                    <th>SUBJECT</th>
                    <th>FACULTY</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timetable?.map((row) => (
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
                        {row.className !== '—' ? (
                          <strong>{formatAcademicSection(row.className)}</strong>
                        ) : (
                          <span className="dp-text-muted">—</span>
                        )}
                      </td>
                      <td className="dp-td-subject">
                        {row.subject !== '—' ? (
                          <div className="dp-subject-cell">
                            <span>{row.subject}</span>
                            {row.subjectCode && <span className="dp-code-chip">{row.subjectCode}</span>}
                          </div>
                        ) : (
                          <span className="dp-text-muted">—</span>
                        )}
                      </td>
                      <td className="dp-td-faculty">
                        {row.faculty !== '—' ? (
                          <span className="dp-faculty-text">{row.faculty}</span>
                        ) : (
                          <span className="dp-text-muted">—</span>
                        )}
                      </td>
                      <td className="dp-td-status">
                        <span className={`dp-status-badge ${row.status.toLowerCase()}`}>
                          <span className={`dp-status-dot ${row.status === 'OCCUPIED' ? 'red' : 'green'}`}></span>
                          <span>{row.status}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
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
