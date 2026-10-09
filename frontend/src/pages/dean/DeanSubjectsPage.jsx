import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BookOpen, ExternalLink, Users, Layers, MapPin, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanSubjectsPage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setLoading(true);
        const res = await deanApi.getSubjectList();
        setSubjects(res.data || []);
      } catch (err) {
        console.error('Failed to load subjects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Subjects
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Review department subjects, course codes, credits, and assigned faculty.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading subjects...</span>
        </div>
      ) : subjects.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <BookOpen size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Subjects Found</div>
          <div className="dp-empty-desc">No subjects registered.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {subjects.map((s) => (
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
                  <span className="dp-period-badge">{s.code}</span>
                  <span className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-secondary)' }}>
                    {s.type || 'THEORY'} • {s.credits || 4} Credits
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {s.name}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 12px 0' }}>
                  Semester: {s.semester?.name || 'Computer Science'}
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--dp-text)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Users size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span><strong>Faculty:</strong> {s.assignedFaculty?.join(', ') || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span><strong>Sections:</strong> {s.sections?.join(', ') || 'All'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span><strong>Rooms:</strong> {s.rooms?.join(', ') || 'N/A'}</span>
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
                      category: 'SUBJECT',
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

export default DeanSubjectsPage;
