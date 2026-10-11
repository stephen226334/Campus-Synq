import React from 'react';
import { ShieldCheck, Mail, Building, User, CheckCircle2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DeanProfilePage = () => {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Dean / HOD Executive Profile
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
          Department of Computer Science Academic Executive Oversight Account.
        </p>
      </div>

      <div
        style={{
          background: 'var(--dp-card)',
          border: '1px solid var(--dp-border)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '28px',
          boxShadow: 'var(--dp-shadow-subtle)',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--dp-primary), var(--dp-primary-dark))',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(109, 61, 245, 0.25)'
            }}
          >
            {(user?.fullName || 'D')[0].toUpperCase()}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--dp-text)', margin: 0 }}>
                {user?.fullName || 'Dr. R Kumar'}
              </h2>
              <span className="dp-badge-portal">DEAN / HOD</span>
            </div>
            <p style={{ color: 'var(--dp-secondary)', fontSize: '0.88rem', margin: 0 }}>
              Dean of Department • Computer Science Department
            </p>
          </div>
        </div>

        <div className="dp-info-grid" style={{ gap: '16px' }}>
          <div className="dp-info-cell">
            <div className="dp-info-cell-label">Official Email</div>
            <div className="dp-info-cell-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={15} style={{ color: 'var(--dp-primary)' }} />
              <span>{user?.email || 'dean@campussynq.com'}</span>
            </div>
          </div>

          <div className="dp-info-cell">
            <div className="dp-info-cell-label">Assigned Department</div>
            <div className="dp-info-cell-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building size={15} style={{ color: 'var(--dp-primary)' }} />
              <span>{user?.department || 'Computer Science Department'}</span>
            </div>
          </div>

          <div className="dp-info-cell">
            <div className="dp-info-cell-label">Authorization Role</div>
            <div className="dp-info-cell-value" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={15} style={{ color: 'var(--dp-primary)' }} />
              <span>DEAN / HOD (Executive Oversight)</span>
            </div>
          </div>

          <div className="dp-info-cell">
            <div className="dp-info-cell-label">Account Status</div>
            <div className="dp-info-cell-value" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--dp-success)' }}>
              <CheckCircle2 size={15} />
              <span>ACTIVE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Permissions Summary Card */}
      <div
        style={{
          background: 'var(--dp-card)',
          border: '1px solid var(--dp-border)',
          borderRadius: 'var(--dp-radius-md)',
          padding: '24px',
          boxShadow: 'var(--dp-shadow-subtle)'
        }}
      >
        <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--dp-text)', marginBottom: '12px' }}>
          Dean Portal Capabilities & Permissions
        </h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--dp-secondary)' }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--dp-success)' }} />
            <span><strong>Global Directory Inspection:</strong> Search, view, and inspect all faculty, subjects, rooms, labs, auditoriums, and cohorts.</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--dp-success)' }} />
            <span><strong>Timetable Oversight:</strong> Live visibility into institutional 12-hour period matrix.</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={15} style={{ color: 'var(--dp-success)' }} />
            <span><strong>Substitution Management:</strong> Modify substitutes, rooms, and validate scheduling conflicts with instant real-time synchronization.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DeanProfilePage;
