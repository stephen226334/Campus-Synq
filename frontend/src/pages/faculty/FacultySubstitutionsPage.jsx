import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft,
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';

export const FacultySubstitutionsPage = () => {
  const { user } = useAuth();
  const [substitutions, setSubstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSubstitutions = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const res = await facultyApi.getSubstitutions();
      if (res && res.data) {
        setSubstitutions(res.data);
      }
    } catch (err) {
      console.error('Failed to load substitutions:', err);
      setError(err.message || 'Unable to load substitutions.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubstitutions();
  }, [fetchSubstitutions]);

  useRealtimeEvents(() => fetchSubstitutions(true));

  if (isLoading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <LoadingSkeleton message="Loading substitution records..." rows={4} cols={4} />
      </div>
    );
  }

  const userId = user?.id || user?._id;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--fp-text)', letterSpacing: '-0.01em' }}>
            Class Substitutions Registry
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--fp-secondary)', margin: 0 }}>
            Audit log of all delegated, received, and scheduled academic periods
          </p>
        </div>
        <button
          type="button"
          className="fp-btn-outline"
          onClick={() => fetchSubstitutions(false)}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {substitutions.length === 0 ? (
        <div className="fp-stat-card" style={{ textAlign: 'center', padding: '48px 24px', alignItems: 'center' }}>
          <ArrowRightLeft size={42} style={{ color: 'var(--fp-muted)', marginBottom: '10px' }} />
          <h3 style={{ margin: '4px 0', color: 'var(--fp-text)' }}>No Substitution Records Found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--fp-secondary)' }}>
            You have not initiated or received any class substitutions yet.
          </p>
        </div>
      ) : (
        <div
          className="fp-stat-card"
          style={{
            padding: 0,
            overflow: 'hidden',
            border: '1px solid var(--fp-border-light)'
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table className="fp-weekly-matrix-table" style={{ minWidth: '850px' }}>
              <thead>
                <tr>
                  <th style={{ width: '130px', textAlign: 'left' }}>Date & Day</th>
                  <th>Period</th>
                  <th>Subject & Section</th>
                  <th>Room</th>
                  <th>Original Faculty</th>
                  <th>Substitute Faculty</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {substitutions.map((sub) => {
                  const isInitiator = sub.originalFaculty?._id === userId || sub.createdBy === userId;
                  const isSubstitute = sub.substituteFaculty?._id === userId;

                  return (
                    <tr key={sub._id}>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--fp-text)' }}>{sub.day}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--fp-secondary)' }}>{sub.date}</span>
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--fp-primary)' }}>
                          {sub.period?.periodNumber || 'Period'}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--fp-secondary)' }}>
                          {sub.period?.startTime} - {sub.period?.endTime}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--fp-text)' }}>
                          {sub.subject?.name || 'Class Subject'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--fp-secondary)' }}>
                          {sub.section?.name}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                          <MapPin size={12} style={{ color: 'var(--fp-secondary)' }} />
                          <span>Room {sub.roomDetails?.roomNumber || 'Room'}</span>
                        </span>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{sub.originalFaculty?.fullName || 'Faculty'}</span>
                          {isInitiator && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--fp-primary-soft)',
                                color: 'var(--fp-primary)',
                                fontWeight: 600
                              }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={14} style={{ color: 'var(--fp-primary)' }} />
                          <strong>{sub.substituteFaculty?.fullName || 'Colleague'}</strong>
                          {isSubstitute && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                backgroundColor: 'var(--fp-success-soft)',
                                color: 'var(--fp-success)',
                                fontWeight: 600
                              }}
                            >
                              Assigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px', fontSize: '0.8rem', color: 'var(--fp-secondary)' }}>
                        {sub.reason || 'Faculty delegation'}
                      </td>
                      <td style={{ verticalAlign: 'middle', height: 'auto', padding: '14px 16px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            backgroundColor: 'var(--fp-success-soft)',
                            color: 'var(--fp-success)'
                          }}
                        >
                          <CheckCircle size={11} />
                          <span>{sub.status || 'CONFIRMED'}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultySubstitutionsPage;
