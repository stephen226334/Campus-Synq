import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ExternalLink, Mail, Phone, BookOpen, Layers, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanFacultyPage = () => {
  const navigate = useNavigate();

  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        setLoading(true);
        const params = {};
        if (search) params.search = search;
        if (statusFilter !== 'ALL') params.status = statusFilter;
        const res = await deanApi.getFacultyList(params);
        setFacultyList(res.data || []);
      } catch (err) {
        console.error('Failed to load faculty:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFaculty();
  }, [search, statusFilter]);

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
            Faculty Directory
          </h1>
          <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Inspect faculty members, assigned subjects, and weekly schedules.
          </p>
        </div>

        {/* Filter / Search Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--dp-muted)' }} />
            <input
              type="text"
              placeholder="Search faculty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="dp-form-input"
              style={{ paddingLeft: '32px', width: '220px', height: '36px' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="dp-form-select"
            style={{ height: '36px', width: '130px' }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Faculty Cards / Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading faculty directory...</span>
        </div>
      ) : facultyList.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <Users size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Faculty Found</div>
          <div className="dp-empty-desc">No records matched your search filters.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {facultyList.map((f) => (
            <div
              key={f._id}
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <span className="dp-period-badge">{f.facultyId}</span>
                  <span className={`dp-status-badge ${f.status?.toLowerCase()}`}>{f.status}</span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                  {f.fullName}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 12px 0' }}>
                  {f.designation} • {f.department || 'Computer Science'}
                </p>

                <div style={{ fontSize: '0.8rem', color: 'var(--dp-text)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span style={{ wordBreak: 'break-all' }}>{f.officialEmail}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span>{f.assignedSubjects?.length || 0} Assigned Subjects</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--dp-muted)' }} />
                    <span>{f.assignedSections?.length || 0} Assigned Sections</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="dp-btn dp-btn-outline dp-btn-sm"
                style={{ width: '100%' }}
                onClick={() => navigate(`/dean/faculty/${f._id}`)}
                id={`btn-view-faculty-${f._id}`}
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

export default DeanFacultyPage;
