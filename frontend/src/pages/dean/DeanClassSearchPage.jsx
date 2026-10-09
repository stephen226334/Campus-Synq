import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  Layers, 
  Search, 
  DoorOpen, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Filter
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const DeanClassSearchPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRoom = searchParams.get('room') || 'B314';
  const initialDay = searchParams.get('day') || 'Monday';
  const initialTime = searchParams.get('time') || '10:00 AM';

  const [room, setRoom] = useState(initialRoom);
  const [day, setDay] = useState(initialDay);
  const [time, setTime] = useState(initialTime);
  const [className, setClassName] = useState('');
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { showToast } = useToast();

  const daysList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timesList = [
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM'
  ];

  const commonRooms = ['B314', 'B315', 'CS-101', 'CS-201', 'LAB-01', 'B201', 'B205', 'C201'];

  const executeSearch = async (targetRoom = room, targetDay = day, targetTime = time, targetClass = className) => {
    try {
      setLoading(true);
      setSearched(true);
      const res = await deanApi.getClassWiseSearch({
        room: targetRoom,
        day: targetDay,
        time: targetTime,
        class: targetClass
      });
      setResult(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to complete class-wise search', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(initialRoom, initialDay, initialTime);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ room, day, time });
    executeSearch();
  };

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
              Find the class scheduled for a specific room, day and time.
            </p>
          </div>
        </div>
      </div>

      {/* Search Filter Form */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-class-search-grid">
          <div className="dp-form-field">
            <label htmlFor="search-room">Room</label>
            <div className="dp-form-input-wrapper">
              <DoorOpen size={16} className="dp-form-icon" />
              <input
                id="search-room"
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="e.g. B314, CS-101, LAB-01"
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
            <label htmlFor="search-day">Day</label>
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

          <div className="dp-form-field">
            <label htmlFor="search-time">Time</label>
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

          <div className="dp-form-field dp-form-actions">
            <label>&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-primary dp-btn-search"
              disabled={loading}
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
        ) : result ? (
          <div className={`dp-result-inspect-card ${result.status === 'OCCUPIED' ? 'occupied' : 'free'}`}>
            <div className="dp-result-card-header">
              <div className="dp-result-header-left">
                <span className="dp-result-room-tag">ROOM {result.roomNumber}</span>
                <span className="dp-result-time-badge">
                  <Clock size={14} />
                  <span>{result.time}</span>
                </span>
                <span className="dp-result-day-badge">{result.day}</span>
              </div>
              <div className="dp-result-status-indicator">
                <span className={`dp-status-dot ${result.status === 'OCCUPIED' ? 'red' : 'green'}`}></span>
                <span className={`dp-status-label ${result.status === 'OCCUPIED' ? 'occupied' : 'free'}`}>
                  {result.status}
                </span>
              </div>
            </div>

            {result.status === 'OCCUPIED' ? (
              <div className="dp-result-card-body">
                <div className="dp-result-grid-details">
                  <div className="dp-result-detail-item">
                    <span className="dp-detail-label">CLASS</span>
                    <span className="dp-detail-value main">{formatAcademicSection(result.className)}</span>
                  </div>

                  <div className="dp-result-detail-item">
                    <span className="dp-detail-label">SUBJECT</span>
                    <span className="dp-detail-value">
                      <BookOpen size={16} />
                      <strong>{result.subject}</strong>
                      {result.subjectCode && <span className="dp-code-chip">{result.subjectCode}</span>}
                    </span>
                  </div>

                  <div className="dp-result-detail-item">
                    <span className="dp-detail-label">FACULTY</span>
                    <div className="dp-faculty-chip-block">
                      <User size={16} />
                      <span className="dp-detail-value">{result.faculty}</span>
                      {result.isSubstituted && (
                        <span className="dp-badge-substituted">SUBSTITUTED</span>
                      )}
                    </div>
                  </div>

                  <div className="dp-result-detail-item">
                    <span className="dp-detail-label">CAPACITY</span>
                    <span className="dp-detail-value">{result.capacity} Students ({result.roomType})</span>
                  </div>
                </div>

                <div className="dp-result-card-footer">
                  <button
                    type="button"
                    className="dp-btn-secondary"
                    onClick={() => {
                      if (inspectEntity) {
                        inspectEntity({
                          entityType: 'CLASSROOM',
                          id: result.roomNumber,
                          title: `Room ${result.roomNumber}`,
                          details: result
                        });
                      }
                    }}
                  >
                    <ExternalLink size={15} />
                    <span>View Room Details</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="dp-result-card-body free">
                <div className="dp-free-message-box">
                  <CheckCircle2 size={24} style={{ color: 'var(--dp-success)' }} />
                  <div>
                    <h4>No Class Scheduled</h4>
                    <p>Room {result.roomNumber} is currently available. No class is scheduled during this period.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : searched ? (
          <div className="dp-empty-card">
            <AlertCircle size={28} />
            <p>No timetable records found matching the specified room and time.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DeanClassSearchPage;
