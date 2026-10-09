import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DoorOpen, ExternalLink, Calendar, Users, Loader2 } from 'lucide-react';
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
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Classrooms
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Monitor classroom capacity, weekly schedules, and occupancy.
        </p>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {classrooms.map((c) => (
            <div
              key={c._id}
              style={{
                background: 'var(--dp-card)',
                border: '1px solid var(--dp-border)',
                borderRadius: 'var(--dp-radius-md)',
                padding: '20px',
                boxShadow: 'var(--dp-shadow-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="dp-period-badge">Classroom</span>
                  <span className={`dp-status-badge ${c.status?.toLowerCase()}`}>{c.status}</span>
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {c.roomNumber}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 16px 0' }}>
                  Floor: {c.floor || 'Standard Wing'}
                </p>

                <div className="dp-info-grid" style={{ marginBottom: '16px' }}>
                  <div className="dp-info-cell">
                    <div className="dp-info-cell-label">Capacity</div>
                    <div className="dp-info-cell-value">{c.capacity} Seats</div>
                  </div>
                  <div className="dp-info-cell">
                    <div className="dp-info-cell-label">Classes</div>
                    <div className="dp-info-cell-value">{c.assignedSessionsCount || 0} / Week</div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                style={{ width: '100%' }}
                onClick={() => {
                  if (openEntityDrawer) {
                    openEntityDrawer({
                      id: c._id,
                      category: 'CLASSROOM',
                      title: `Room ${c.roomNumber}`,
                      raw: c
                    });
                  }
                }}
              >
                <ExternalLink size={14} />
                <span>View Details</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeanClassroomsPage;
