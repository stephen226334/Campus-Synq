import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Cpu, ExternalLink, BookOpen, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanLabsPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLabs = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getLabList();
        setLabs(res.data || []);
      } catch (err) {
        console.error('Failed to load labs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLabs();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Laboratories
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Inspect department computer and research laboratories.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading laboratories...</span>
        </div>
      ) : labs.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <Cpu size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Labs Found</div>
          <div className="dp-empty-desc">No laboratories registered.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {labs.map((l) => (
            <div
              key={l._id}
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
                  <span className="dp-period-badge">{l.labNumber}</span>
                  <span className={`dp-status-badge ${l.status?.toLowerCase()}`}>{l.status}</span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {l.labName}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 14px 0' }}>
                  Floor: {l.floor || 'Ground Floor'} • Capacity: {l.capacity} Workstations
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)', marginBottom: '16px' }}>
                  <strong>Associated Subjects:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {l.associatedSubjects?.map((sub, i) => (
                      <span key={i} className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-text)' }}>
                        {sub}
                      </span>
                    )) || <span>General Practical</span>}
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
                      id: l._id,
                      category: 'LAB',
                      title: `${l.labNumber} — ${l.labName}`,
                      raw: l
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

export default DeanLabsPage;
