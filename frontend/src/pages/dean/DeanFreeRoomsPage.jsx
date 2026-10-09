import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  CheckCircle2, 
  DoorOpen, 
  Calendar, 
  Clock, 
  Search, 
  Layers, 
  User, 
  BookOpen, 
  AlertCircle,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const DeanFreeRoomsPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDay = searchParams.get('day') || 'Monday';
  const initialTime = searchParams.get('time') || '10:00 AM';

  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timesList = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM'];

  const executeSearch = async (targetDay = day, targetTime = time) => {
    try {
      setLoading(true);
      const res = await deanApi.getFreeRoomsSearch({
        day: targetDay,
        time: targetTime
      });
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to fetch room availability', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(initialDay, initialTime);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ day, time });
    executeSearch();
  };

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Free Rooms</h1>
            <p className="dp-page-subtitle">
              Find rooms available for a specific day and time.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Form */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-free-rooms-grid">
          <div className="dp-form-field">
            <label htmlFor="free-day-select">Day</label>
            <div className="dp-form-input-wrapper">
              <Calendar size={16} className="dp-form-icon" />
              <select
                id="free-day-select"
                value={day}
                onChange={(e) => setDay(e.target.value)}
              >
                {daysList.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="dp-form-field">
            <label htmlFor="free-time-select">Time</label>
            <div className="dp-form-input-wrapper">
              <Clock size={16} className="dp-form-icon" />
              <select
                id="free-time-select"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              >
                {timesList.map((t) => (
                  <option key={t} value={t}>{t}</option>
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
              <span>{loading ? 'Checking...' : 'Find Available Rooms'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Summary Chips */}
      {data && (
        <div className="dp-availability-summary-bar">
          <div className="dp-avail-chip green">
            <span className="dp-status-dot green"></span>
            <strong>{data.totalAvailable} Rooms Available</strong>
          </div>
          <div className="dp-avail-chip red">
            <span className="dp-status-dot red"></span>
            <strong>{data.totalOccupied} Rooms Occupied</strong>
          </div>
          <div className="dp-avail-chip neutral">
            <span>Period: <strong>{data.period} ({data.time})</strong></span>
          </div>
        </div>
      )}

      {/* Results View */}
      {loading ? (
        <div className="dp-loading-card">
          <div className="dp-skeleton-line" style={{ width: '40%', height: '24px' }}></div>
          <div className="dp-skeleton-line" style={{ width: '90%', height: '120px', marginTop: '16px' }}></div>
        </div>
      ) : data ? (
        <div className="dp-rooms-split-layout">
          {/* Section 1: Available Rooms */}
          <div className="dp-rooms-section">
            <div className="dp-section-header green">
              <div className="dp-section-title-wrap">
                <span className="dp-status-dot green"></span>
                <h3>Available Rooms</h3>
              </div>
              <span className="dp-count-badge green">{data.availableRooms?.length || 0}</span>
            </div>

            <div className="dp-free-room-cards-grid">
              {data.availableRooms?.map((r) => (
                <div
                  key={r.roomId || r.roomNumber}
                  className="dp-room-card available"
                  onClick={() => {
                    if (inspectEntity) {
                      inspectEntity({
                        entityType: 'CLASSROOM',
                        id: r.roomNumber,
                        title: `Room ${r.roomNumber}`,
                        details: r
                      });
                    }
                  }}
                >
                  <div className="dp-room-card-top">
                    <span className="dp-room-number-text">{r.roomNumber}</span>
                    <span className="dp-badge-status-free">AVAILABLE</span>
                  </div>
                  <div className="dp-room-card-meta">
                    <span>{r.name || r.type}</span>
                    <span>Cap: {r.capacity}</span>
                  </div>
                </div>
              ))}
              {data.availableRooms?.length === 0 && (
                <div className="dp-empty-state-cell">No available rooms during this period.</div>
              )}
            </div>
          </div>

          {/* Section 2: Occupied Rooms */}
          <div className="dp-rooms-section">
            <div className="dp-section-header red">
              <div className="dp-section-title-wrap">
                <span className="dp-status-dot red"></span>
                <h3>Occupied Rooms</h3>
              </div>
              <span className="dp-count-badge red">{data.occupiedRooms?.length || 0}</span>
            </div>

            <div className="dp-occupied-room-list">
              {data.occupiedRooms?.map((r) => (
                <div
                  key={r.roomId || r.roomNumber}
                  className="dp-room-card occupied"
                  onClick={() => {
                    if (inspectEntity) {
                      inspectEntity({
                        entityType: 'CLASSROOM',
                        id: r.roomNumber,
                        title: `Room ${r.roomNumber}`,
                        details: r
                      });
                    }
                  }}
                >
                  <div className="dp-occupied-card-header">
                    <div className="dp-occupied-room-title">
                      <strong>{r.roomNumber}</strong>
                      <span className="dp-occupied-class-pill">{formatAcademicSection(r.className)}</span>
                    </div>
                    <span className="dp-badge-status-occupied">OCCUPIED</span>
                  </div>

                  <div className="dp-occupied-details">
                    <div className="dp-detail-line">
                      <BookOpen size={14} />
                      <span>{r.subject}</span>
                    </div>
                    <div className="dp-detail-line">
                      <User size={14} />
                      <span>Faculty: {r.faculty}</span>
                    </div>
                    <div className="dp-detail-line">
                      <Clock size={14} />
                      <span>{r.period} • {r.time}</span>
                    </div>
                  </div>
                </div>
              ))}
              {data.occupiedRooms?.length === 0 && (
                <div className="dp-empty-state-cell">No occupied rooms during this period.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DeanFreeRoomsPage;
