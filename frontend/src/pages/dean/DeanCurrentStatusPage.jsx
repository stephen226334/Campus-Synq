import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Building,
  Users
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';
import SearchableDropdown from '../../components/common/SearchableDropdown';

export const DeanCurrentStatusPage = ({ onInspectEntity }) => {
  const { openEntityDrawer } = useOutletContext() || {};
  const inspectEntity = onInspectEntity || openEntityDrawer;
  const [searchParams, setSearchParams] = useSearchParams();

  const [entities, setEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(true);
  const [entitiesError, setEntitiesError] = useState(null);

  const initialQuery = searchParams.get('q') || '';

  const [selectedEntityId, setSelectedEntityId] = useState(initialQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liveClock, setLiveClock] = useState('');
  const { showToast } = useToast();

  const activeQueryRef = useRef(selectedEntityId);
  activeQueryRef.current = selectedEntityId;

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

  // 1. Fetch Classrooms, Labs, Auditoriums, and Faculty dynamically from database
  useEffect(() => {
    const fetchEntities = async () => {
      try {
        setLoadingEntities(true);
        setEntitiesError(null);

        const [classroomsRes, labsRes, audsRes, facultyRes] = await Promise.all([
          deanApi.getClassroomList(),
          deanApi.getLabList(),
          deanApi.getAuditoriumList(),
          deanApi.getFacultyList()
        ]);

        const allList = [];

        // Classrooms
        (classroomsRes.data || []).forEach((c) => {
          allList.push({
            value: c._id,
            label: `Room ${c.roomNumber}${c.name && c.name !== c.roomNumber ? ` (${c.name})` : ''}`,
            subLabel: `Classroom • Capacity: ${c.capacity || 60} seats`,
            badge: 'Classroom',
            group: 'Classrooms',
            searchTerms: `${c.roomNumber} ${c.name || ''} Classroom`,
            type: 'ROOM',
            raw: c
          });
        });

        // Labs
        (labsRes.data || []).forEach((l) => {
          allList.push({
            value: l._id,
            label: `Lab ${l.labNumber}${l.labName ? ` (${l.labName})` : ''}`,
            subLabel: `Laboratory • Capacity: ${l.capacity || 40} seats`,
            badge: 'Lab',
            group: 'Laboratories',
            searchTerms: `${l.labNumber} ${l.labName || ''} Lab Laboratory`,
            type: 'ROOM',
            raw: l
          });
        });

        // Auditoriums
        (audsRes.data || []).forEach((a) => {
          allList.push({
            value: a._id,
            label: `${a.auditoriumNumber || a.name || 'Auditorium'}`,
            subLabel: `Auditorium • Capacity: ${a.capacity || 200} seats`,
            badge: 'Auditorium',
            group: 'Auditoriums',
            searchTerms: `${a.auditoriumNumber || ''} ${a.name || ''} Auditorium`,
            type: 'ROOM',
            raw: a
          });
        });

        // Faculty
        (facultyRes.data || []).forEach((f) => {
          allList.push({
            value: f._id,
            label: f.fullName,
            subLabel: `${f.designation || 'Faculty'} • ID: ${f.facultyId || '—'} • ${f.department || 'Computer Science'}`,
            badge: 'Faculty',
            group: 'Faculty Members',
            searchTerms: `${f.fullName} ${f.facultyId || ''} ${f.officialEmail || ''} Faculty`,
            type: 'FACULTY',
            raw: f
          });
        });

        setEntities(allList);

        if (allList.length > 0) {
          let matched = null;
          if (initialQuery) {
            matched = allList.find(
              (item) =>
                item.value === initialQuery ||
                item.label.toLowerCase().includes(initialQuery.toLowerCase()) ||
                item.searchTerms.toLowerCase().includes(initialQuery.toLowerCase())
            );
          }
          const defaultItem = matched || allList[0];
          setSelectedEntityId(defaultItem.value);
        }
      } catch (err) {
        console.error('Failed to load entity directories:', err);
        setEntitiesError('Unable to load directory records from server');
      } finally {
        setLoadingEntities(false);
      }
    };

    fetchEntities();
  }, []);

  // Execute Current Status search
  const executeSearch = async (targetId = selectedEntityId) => {
    if (!targetId) return;

    try {
      setLoading(true);
      const res = await deanApi.getCurrentStatusSearch(targetId);
      setData(res.data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Unable to fetch current status', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Run initial search once default entity is ready
  useEffect(() => {
    if (selectedEntityId && !data) {
      executeSearch(selectedEntityId);
    }
  }, [selectedEntityId]);

  // Auto-refresh every 30 seconds for live timetable synchronization
  useEffect(() => {
    const autoRefreshTimer = setInterval(() => {
      if (activeQueryRef.current) {
        executeSearch(activeQueryRef.current);
      }
    }, 30000);

    return () => clearInterval(autoRefreshTimer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEntityId) {
      showToast('Please select a room or faculty member', 'warning');
      return;
    }
    setSearchParams({ q: selectedEntityId });
    executeSearch(selectedEntityId);
  };

  const selectedItem = entities.find((e) => e.value === selectedEntityId);

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
              Check real-time availability and ongoing classes for any classroom, lab, auditorium, or faculty member.
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
        <form onSubmit={handleSubmit} className="dp-status-search-grid">
          {/* Dynamic Searchable Dropdown */}
          <div className="dp-form-field dp-status-input-field">
            <SearchableDropdown
              id="current-status-query"
              label="Search Room or Faculty"
              options={entities}
              value={selectedEntityId}
              onChange={(val) => {
                setSelectedEntityId(val);
                if (val) executeSearch(val);
              }}
              placeholder="Search classroom, lab, auditorium, or faculty member..."
              loading={loadingEntities}
              loadingText="Loading rooms and faculty..."
              error={entitiesError}
              icon={Search}
              required
            />
          </div>

          <div className="dp-form-field dp-form-actions">
            <label className="dp-form-label dp-label-spacer">&nbsp;</label>
            <button
              type="submit"
              className="dp-btn-search dp-btn-primary"
              disabled={loading || loadingEntities}
              id="btn-search-current-status"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Checking...' : 'Check Status'}</span>
            </button>
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
            /* Room / Venue Status Output */
            <div className={`dp-status-display-card ${data.status === 'OCCUPIED' ? 'occupied' : 'free'}`}>
              <div className="dp-status-card-header">
                <div className="dp-status-card-title-meta">
                  <span className="dp-room-tag">{data.title || selectedItem?.label || 'ROOM'}</span>
                  {data.roomType && (
                    <span className="dp-period-badge" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                      {data.roomType}
                    </span>
                  )}
                  <span className="dp-status-time-stamp">
                    <Clock size={14} />
                    <span>Checked at {data.currentTime || liveClock}</span>
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
                          const cat = (data.roomType || 'CLASSROOM').toUpperCase();
                          inspectEntity({
                            category: cat === 'LAB' ? 'LAB' : (cat === 'AUDITORIUM' ? 'AUDITORIUM' : 'CLASSROOM'),
                            id: data.roomId || data.roomNumber || selectedEntityId,
                            title: `Room ${data.roomNumber || selectedItem?.label}`,
                            details: data
                          });
                        }
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>View Venue Details</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="dp-status-card-body free">
                  <div className="dp-free-message-box">
                    <CheckCircle2 size={24} style={{ color: 'var(--dp-success)' }} />
                    <div>
                      <h4>Available</h4>
                      <p>{data.roomName || data.title || 'This venue'} is currently free. No class is scheduled right now.</p>
                      <div className="dp-next-status-box" style={{ marginTop: '8px' }}>
                        <span className="dp-next-status-label">NEXT:</span>
                        <span className="dp-next-status-val">{data.nextStatusChange}</span>
                      </div>
                    </div>
                  </div>
                  <div className="dp-status-card-footer" style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      className="dp-btn-secondary"
                      onClick={() => {
                        if (inspectEntity) {
                          const cat = (data.roomType || 'CLASSROOM').toUpperCase();
                          inspectEntity({
                            category: cat === 'LAB' ? 'LAB' : (cat === 'AUDITORIUM' ? 'AUDITORIUM' : 'CLASSROOM'),
                            id: data.roomId || data.roomNumber || selectedEntityId,
                            title: `Room ${data.roomNumber || selectedItem?.label}`,
                            details: data
                          });
                        }
                      }}
                    >
                      <ExternalLink size={14} />
                      <span>View Venue Details</span>
                    </button>
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
                  <span className="dp-period-badge" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                    FACULTY
                  </span>
                  <span className="dp-status-time-stamp">
                    <Clock size={14} />
                    <span>Checked at {data.currentTime || liveClock}</span>
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
                      <span className="dp-status-item-label">VENUE</span>
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
                            category: 'FACULTY',
                            entityType: 'FACULTY',
                            id: data.facultyId || selectedEntityId,
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
                      <p>{data.title} has no scheduled class in progress right now.</p>
                      <div className="dp-next-status-box" style={{ marginTop: '8px' }}>
                        <span className="dp-next-status-label">NEXT:</span>
                        <span className="dp-next-status-val">{data.nextStatusChange}</span>
                      </div>
                    </div>
                  </div>
                  <div className="dp-status-card-footer" style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      className="dp-btn-secondary"
                      onClick={() => {
                        if (inspectEntity) {
                          inspectEntity({
                            category: 'FACULTY',
                            entityType: 'FACULTY',
                            id: data.facultyId || selectedEntityId,
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
              )}
            </div>
          ) : (
            <div className="dp-empty-card">
              <AlertCircle size={28} />
              <p>{data.message || 'No active record found for the selected entity.'}</p>
            </div>
          )
        ) : null}
      </div>
    </div>
  );
};

export default DeanCurrentStatusPage;
