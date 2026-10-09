import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Tv, ExternalLink, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanAuditoriumsPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [auditoriums, setAuditoriums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAuditoriums = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getAuditoriumList();
        setAuditoriums(res.data || []);
      } catch (err) {
        console.error('Failed to load auditoriums:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditoriums();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Auditoriums
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Inspect department auditoriums and seminar halls.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading auditoriums...</span>
        </div>
      ) : auditoriums.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <Tv size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Auditoriums Found</div>
          <div className="dp-empty-desc">No auditoriums configured in database.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {auditoriums.map((a) => (
            <div
              key={a._id}
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
                  <span className="dp-period-badge">{a.auditoriumNumber}</span>
                  <span className={`dp-status-badge ${a.status?.toLowerCase()}`}>{a.status}</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {a.auditoriumName}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--dp-secondary)', margin: '0 0 16px 0' }}>
                  Capacity: {a.capacity} Seats
                </p>
              </div>

              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                style={{ width: '100%' }}
                onClick={() => {
                  if (openEntityDrawer) {
                    openEntityDrawer({
                      id: a._id,
                      category: 'AUDITORIUM',
                      title: a.auditoriumName,
                      raw: a
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

export default DeanAuditoriumsPage;
