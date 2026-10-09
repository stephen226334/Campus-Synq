import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Building2,
  ShieldCheck,
  Award,
  IdCard,
  Briefcase
} from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

export const FacultyProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await facultyApi.getProfile();
        if (res && res.data) {
          setProfile(res.data);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const data = profile || user;

  if (isLoading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <LoadingSkeleton message="Loading faculty profile details..." rows={4} cols={2} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--fp-text)', letterSpacing: '-0.01em' }}>
          Faculty Profile
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--fp-secondary)', margin: 0 }}>
          Department credentials, academic designation, and account permissions
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)', gap: '22px', alignItems: 'start' }}>
        {/* Left: Summary Avatar Card */}
        <div className="fp-stat-card" style={{ padding: '28px 24px', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: 'var(--fp-primary)',
              color: '#FFFFFF',
              fontSize: '2rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
              boxShadow: '0 4px 14px rgba(109, 61, 245, 0.3)'
            }}
          >
            {(data?.fullName || 'F')[0].toUpperCase()}
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--fp-text)' }}>
            {data?.fullName}
          </h2>

          <p style={{ fontSize: '0.85rem', color: 'var(--fp-secondary)', margin: '0 0 12px 0' }}>
            {data?.designation || 'Faculty Member'}
          </p>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: 'var(--fp-primary-soft)',
              color: 'var(--fp-primary)',
              letterSpacing: '0.04em'
            }}
          >
            {data?.facultyId || 'FAC-ID'}
          </span>

          <div
            style={{
              width: '100%',
              borderTop: '1px solid var(--fp-border-light)',
              marginTop: '20px',
              paddingTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              textAlign: 'left',
              fontSize: '0.82rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fp-secondary)' }}>
              <Building2 size={15} style={{ color: 'var(--fp-primary)' }} />
              <span style={{ color: 'var(--fp-text)', fontWeight: 500 }}>
                {data?.department || 'Computer Science Department'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fp-secondary)' }}>
              <ShieldCheck size={15} style={{ color: 'var(--fp-success)' }} />
              <span>Role: <strong style={{ color: 'var(--fp-text)' }}>{data?.role || 'FACULTY'}</strong></span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fp-secondary)' }}>
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--fp-success-soft)',
                  color: 'var(--fp-success)'
                }}
              >
                ● ACTIVE FACULTY
              </span>
            </div>
          </div>
        </div>

        {/* Right: Detailed Credentials Grid Card */}
        <div className="fp-stat-card" style={{ padding: '28px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 18px 0', color: 'var(--fp-text)' }}>
            Official Academic Credentials
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Full Legal Name
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-text)' }}>
                {data?.fullName}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Faculty ID
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-text)' }}>
                {data?.facultyId || 'FAC-001'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Official CampusSynq Email
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-primary)', wordBreak: 'break-all' }}>
                {data?.officialEmail || data?.email}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Personal Email
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--fp-text)', wordBreak: 'break-all' }}>
                {data?.personalEmail || 'Configured via Admin'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Academic Department
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-text)' }}>
                {data?.department || 'Computer Science Department'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Academic Designation
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-text)' }}>
                {data?.designation || 'Faculty Member'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Contact Phone
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--fp-text)' }}>
                {data?.phone || 'On file with Department'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--fp-secondary)', textTransform: 'uppercase' }}>
                Portal Authority
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--fp-text)' }}>
                Verified Faculty Account
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacultyProfilePage;
