import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { 
  Activity, 
  Search, 
  Clock, 
  DoorOpen, 
  User, 
  BookOpen, 
  Layers, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const DeanCurrentStatusPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || 'B314';

  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  const { showToast } = useToast();

  const commonQueries = ['B314', 'Prof. Ravi', 'CS-101', 'Subu', 'LAB-01', 'Dr. Kumar'];

  // Central live clock in 12-hour format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setLiveClock(`${hours}:${minutes}:${seconds} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const executeSearch = async (targetQuery = query) => {
    try {
      setLoading(true);
      const res = await deanApi.getCurrentStatusSearch(targetQuery);
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to fetch current status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    executeSearch(initialQuery);

    // Auto-refresh every 30 seconds for live timetable sync
    const autoRefreshTimer = setInterval(() => {
      executeSearch(query);
    }, 30000);

    return () => clearInterval(autoRefreshTimer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query });
    executeSearch();
  };

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Current Status</h1>
            <p className="dp-page-subtitle">
              Check the current status of a classroom or faculty member.
            </p>
          </div>
        </div>

        {/* Live Clock Chip */}
        <div className="dp-live-clock-pill">
          <Clock size={16} style={{ color: 'var(--dp-primary)' }} />
          <span>Live Clock: <strong>{liveClock}</strong></span>
        </div>
      </div>

      {/* Query Bar */}
      <div className="dp-search-form-card">
        <form onSubmit={handleSubmit} className="dp-status-search-form">
          <div className="dp-status-search-field">
            <label htmlFor="current-status-query">Search room or faculty</label>
            <div className="dp-form-input-wrapper">
              <Search size={18} className="dp-form-icon" />
              <input
                id="current-status-query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search room or faculty (e.g. B314, Prof. Ravi)..."
                required
              />
              <button
                type="submit"
                className="dp-btn-primary"
                disabled={loading}
              >
                {loading ? 'Checking...' : 'Check Status'}
              </button>
            </div>
            <div className="dp-quick-tags">
              {commonQueries.map((q) => (
                <button
                  type="button"
                  key={q}
                  className={`dp-quick-tag ${query === q ? 'active' : ''}`}
                  onClick={() => {
                    setQuery(q);
                    setSearchParams({ q });
                    executeSearch(q);
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Results View */}
      <div className="dp-status-results-wrapper">
        {loading ? (
          <div className="dp-loading-card">
            <div className="dp-skeleton-line" style={{ width: '40%', height: '24px' }}></div>
            <div className="dp-skeleton-line" style={{ width: '90%', height: '140px', marginTop: '16px' }}></div>
          </div>
        ) : data ? (
          data.entityType === 'ROOM' ? (
            /* Room Status Output */
            <div className={`dp-status-display-card ${data.status === 'OCCUPIED' ? 'occupied' : 'free'}`}>
              <div className="dp-status-card-header">
                <div className="dp-status-card-title-meta">
                  <span className="dp-room-tag">{data.title}</span>
                  <span className="dp-status-time-stamp">
                    <Clock size={14} />
                    <span>Checked at {data.currentTime}</span>
                  </span>
                </div>
                <div className={`dp-status-live-indicator ${data.status === 'OCCUPIED' ? 'occupied' : 'free'}`}>
                  <span className={`dp-status-dot ${data.status === 'OCCUPIED' ? 'red' : 'green'}`}></span>
                  <span className="dp-status-text">{data.status === 'OCCUPIED' ? 'OCCUPIED' : 'AVAILABLE'}</span>
                </div>
              </div>

              {data.status === 'OCCUPIED' ? (
                <div className="dp-status-card-body">
                  <div className="dp-status-details-grid">
                    <div className="dp-status-item">
                      <span className="dp-status-item-label">CLASS</span>
                      <strong className="dp-status-item-value">{formatAcademicSection(data.className)}</strong>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">SUBJECT</span>
                      <div className="dp-flex-val">
                        <BookOpen size={15} />
                        <strong>{data.subject}</strong>
                      </div>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">FACULTY</span>
                      <div className="dp-flex-val">
                        <User size={15} />
                        <strong>{data.faculty}</strong>
                      </div>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">TIME</span>
                      <div className="dp-flex-val">
                        <Clock size={15} />
                        <span>{data.period}</span>
                      </div>
                    </div>
                  </div>

                  <div className="dp-status-card-footer">
                    <div className="dp-next-status-box">
                      <span className="dp-next-status-label">NEXT:</span>
                      <span className="dp-next-status-val">{data.nextStatusChange}</span>
                    </div>

                    <button
                      type="button"
                      className="dp-btn-secondary"
                      onClick={() => {
                        if (inspectEntity) {
                          inspectEntity({
                            entityType: 'CLASSROOM',
                            id: data.roomNumber,
                            title: `Room ${data.roomNumber}`,
                            details: data
                          });
                        }
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>View Room Timetable</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dp-status-card-body free">
                  <div className="dp-free-message-box">
                    <CheckCircle2 size={24} style={{ color: 'var(--dp-success)' }} />
                    <div>
                      <h4>Available</h4>
                      <p>No class is currently scheduled.</p>
                      <div className="dp-next-status-box" style={{ marginTop: '8px' }}>
                        <span className="dp-next-status-label">NEXT:</span>
                        <span className="dp-next-status-val">{data.nextStatusChange}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : data.entityType === 'FACULTY' ? (
            /* Faculty Status Output */
            <div className={`dp-status-display-card ${data.status === 'FREE' ? 'free' : 'occupied'}`}>
              <div className="dp-status-card-header">
                <div className="dp-status-card-title-meta">
                  <span className="dp-faculty-title-tag">{data.title}</span>
                  <span className="dp-status-time-stamp">
                    <Clock size={14} />
                    <span>Checked at {data.currentTime}</span>
                  </span>
                </div>
                <div className={`dp-status-live-indicator ${data.status === 'FREE' ? 'free' : 'occupied'}`}>
                  <span className={`dp-status-dot ${data.status === 'FREE' ? 'green' : (data.badgeColor || 'red')}`}></span>
                  <span className="dp-status-text">
                    {data.status === 'FREE' ? 'AVAILABLE' : (data.status === 'IN_LAB' ? `IN LAB — ${data.room}` : 'TEACHING')}
                  </span>
                </div>
              </div>

              {data.status !== 'FREE' ? (
                <div className="dp-status-card-body">
                  <div className="dp-status-details-grid">
                    <div className="dp-status-item">
                      <span className="dp-status-item-label">ROOM</span>
                      <strong className="dp-status-item-value">{data.room}</strong>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">SUBJECT</span>
                      <div className="dp-flex-val">
                        <BookOpen size={15} />
                        <strong>{data.subject}</strong>
                      </div>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">CLASS</span>
                      <div className="dp-flex-val">
                        <Layers size={15} />
                        <strong>{formatAcademicSection(data.className)}</strong>
                      </div>
                    </div>

                    <div className="dp-status-item">
                      <span className="dp-status-item-label">TIME</span>
                      <div className="dp-flex-val">
                        <Clock size={15} />
                        <span>{data.period}</span>
                      </div>
                    </div>
                  </div>

                  <div className="dp-status-card-footer">
                    <div className="dp-next-status-box">
                      <span className="dp-next-status-label">NEXT:</span>
                      <span className="dp-next-status-val">{data.nextStatusChange}</span>
                    </div>

                    <button
                      type="button"
                      className="dp-btn-secondary"
                      onClick={() => {
                        if (inspectEntity) {
                          inspectEntity({
                            entityType: 'FACULTY',
                            id: data.title,
                            title: data.title,
                            details: data
                          });
                        }
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>View Faculty Schedule</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dp-status-card-body free">
                  <div className="dp-free-message-box">
                    <CheckCircle2 size={24} style={{ color: 'var(--dp-success)' }} />
                    <div>
                      <h4>Available</h4>
                      <p>No class is currently in progress.</p>
                      <div className="dp-next-status-box" style={{ marginTop: '8px' }}>
                        <span className="dp-next-status-label">NEXT:</span>
                        <span className="dp-next-status-val">{data.nextStatusChange}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="dp-empty-card">
              <AlertCircle size={28} />
              <p>{data.message || 'No active record found.'}</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};

export default DeanCurrentStatusPage;
