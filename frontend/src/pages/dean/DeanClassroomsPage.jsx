import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DoorOpen, ExternalLink, Calendar, Users, Loader2, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanClassroomsPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getClassroomList();
        setClassrooms(res.data || []);
      } catch (err) {
        console.error('Failed to load classrooms:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassrooms();
  }, []);

  return (
    <div className="dp-page-container">
      {/* Page Header */}
      <div className="dp-page-header">
        <div className="dp-page-title-block">
          <div className="dp-page-icon-badge">
            <DoorOpen size={22} />
          </div>
          <div>
            <h1 className="dp-page-title">Classrooms</h1>
            <p className="dp-page-subtitle">
              Monitor classroom capacity, weekly schedules, and academic space occupancy.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading classrooms...</span>
        </div>
      ) : classrooms.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <DoorOpen size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Classrooms Found</div>
          <div className="dp-empty-desc">No classrooms configured in the system.</div>
        </div>
      ) : (
        <div className="dp-classroom-grid">
          {classrooms.map((c) => (
            <div key={c._id} className="dp-classroom-card">
              <div className="dp-classroom-card-top">
                {/* Header Row: Room Type & Availability Badge */}
                <div className="dp-classroom-header-row">
                  <span className="dp-asset-type-badge">
                    <DoorOpen size={13} />
                    <span>Classroom</span>
                  </span>
                  <span className={`dp-status-badge ${c.status?.toLowerCase() === 'inactive' ? 'occupied' : 'active'}`}>
                    <span className={`dp-status-dot ${c.status?.toLowerCase() === 'inactive' ? 'red' : 'green'}`}></span>
                    <span>{c.status || 'ACTIVE'}</span>
                  </span>
                </div>

                {/* Room Information: Balanced Typography & Hierarchy */}
                <div className="dp-classroom-info-block">
                  <h3 className="dp-classroom-title">Room {c.roomNumber}</h3>
                  <p className="dp-classroom-location">
                    <MapPin size={13} />
                    <span>{c.floor || 'Level 2 · Main Academic Block'}</span>
                  </p>
                </div>

                {/* Metrics: Consistent Blocks with Icons */}
                <div className="dp-classroom-metrics-grid">
                  <div className="dp-metric-cell">
                    <div className="dp-metric-label">
                      <Users size={12} />
                      <span>Capacity</span>
                    </div>
                    <div className="dp-metric-val">{c.capacity} Seats</div>
                  </div>
                  <div className="dp-metric-cell">
                    <div className="dp-metric-label">
                      <Calendar size={12} />
                      <span>Classes</span>
                    </div>
                    <div className="dp-metric-val">{c.assignedSessionsCount || 0} / Week</div>
                  </div>
                </div>
              </div>

              {/* Action Button Aligned along Bottom */}
              <div className="dp-classroom-card-action">
                <button
                  type="button"
                  className="dp-btn-card-action"
                  onClick={() => {
                    if (openEntityDrawer) {
                      openEntityDrawer({
                        id: c._id || c.roomNumber,
                        category: 'CLASSROOM',
                        title: `Room ${c.roomNumber}`,
                        raw: c
                      });
                    }
                  }}
                  aria-label={`View details for Room ${c.roomNumber}`}
                >
                  <ExternalLink size={14} />
                  <span>View Details</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeanClassroomsPage;
