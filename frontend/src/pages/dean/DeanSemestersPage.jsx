import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { GraduationCap, ExternalLink, Layers, BookOpen, Calendar, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanSemestersPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSemesters = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getSemesterList();
        setSemesters(res.data || []);
      } catch (err) {
        console.error('Failed to load semesters:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSemesters();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Semesters
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Inspect academic semesters, enrolled sections, and subjects.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading semesters...</span>
        </div>
      ) : semesters.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <GraduationCap size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Semesters Found</div>
          <div className="dp-empty-desc">No academic semesters configured.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {semesters.map((s) => (
            <div
              key={s._id}
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
                  <span className="dp-period-badge">{s.academicYear}</span>
                  <span className={`dp-status-badge ${s.status?.toLowerCase()}`}>{s.status}</span>
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {s.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 16px 0' }}>
                  Department of Computer Science
                </p>

                <div className="dp-info-grid" style={{ marginBottom: '16px' }}>
                  <div className="dp-info-cell">
                    <div className="dp-info-cell-label">Sections</div>
                    <div className="dp-info-cell-value">{s.sectionsCount || 0}</div>
                  </div>
                  <div className="dp-info-cell">
                    <div className="dp-info-cell-label">Subjects</div>
                    <div className="dp-info-cell-value">{s.subjectsCount || 0}</div>
                  </div>
                  <div className="dp-info-cell" style={{ gridColumn: 'span 2' }}>
                    <div className="dp-info-cell-label">Weekly Classes</div>
                    <div className="dp-info-cell-value">{s.timetableCount || 0} Classes</div>
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
                      id: s._id,
                      category: 'SEMESTER',
                      title: s.name,
                      raw: s
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

export default DeanSemestersPage;
