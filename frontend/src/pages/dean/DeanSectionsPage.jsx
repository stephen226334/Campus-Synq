import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Layers, ExternalLink, Users, BookOpen, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const DeanSectionsPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getSectionList();
        setSections(res.data || []);
      } catch (err) {
        console.error('Failed to load sections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Sections
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Inspect class sections, student capacity, and semester affiliations.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading class sections...</span>
        </div>
      ) : sections.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <Layers size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Sections Found</div>
          <div className="dp-empty-desc">No class sections registered in database.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {sections.map((sec) => (
            <div
              key={sec._id}
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
                  <span className="dp-period-badge">{sec.semester?.name || 'Semester'}</span>
                  <span className={`dp-status-badge ${sec.status?.toLowerCase()}`}>{sec.status || 'ACTIVE'}</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {formatAcademicSection(sec.name, sec.semester?.name)}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 16px 0' }}>
                  Capacity: {sec.capacity || 60} Students • {sec.weeklySessionsCount || 0} Classes/Week
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)', marginBottom: '16px' }}>
                  <strong>Assigned Faculty:</strong>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {sec.assignedFaculty?.map((f, i) => (
                      <span key={i} className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-text)' }}>
                        {f}
                      </span>
                    )) || <span>None</span>}
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
                      id: sec._id,
                      category: 'SECTION',
                      title: sec.name,
                      raw: sec
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

export default DeanSectionsPage;
