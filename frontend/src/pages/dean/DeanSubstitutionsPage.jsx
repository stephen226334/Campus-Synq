import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  ArrowRightLeft,
  Clock,
  Calendar,
  User,
  Users,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit,
  Loader2,
  RefreshCw
} from 'lucide-react';
import deanApi from '../../api/dean';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';
import { formatAcademicSection, formatAcademicStatus } from '../../utils/academicFormatter';

export const DeanSubstitutionsPage = () => {
  const { openEntityDrawer, openModifyModal, refreshKey } = useOutletContext() || {};

  const [substitutions, setSubstitutions] = useState([]);
  const [metrics, setMetrics] = useState({ pendingCount: 0, activeCount: 0, todayCount: 0, completedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchSubstitutions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'TODAY') {
          params.date = new Date().toISOString().split('T')[0];
        } else {
          params.status = statusFilter;
        }
      }

      const res = await deanApi.getSubstitutions(params);
      setSubstitutions(res.data?.substitutions || []);
      if (res.data?.metrics) {
        setMetrics(res.data.metrics);
      }
    } catch (err) {
      console.error('Failed to load substitutions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubstitutions();
  }, [statusFilter, refreshKey]);

  const handleRealtimeSync = useCallback(() => {
    fetchSubstitutions();
  }, []);

  // Real-time Event Listener for instant update with auto-reconnection and stale data reload
  useRealtimeEvents(handleRealtimeSync, {
    endpoint: '/api/v1/dean/events',
    onReconnect: handleRealtimeSync
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
            Substitutions
          </h1>
          <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Computer Science Department — Faculty Substitutions
          </p>
        </div>

        <button
          type="button"
          className="dp-btn dp-btn-outline dp-btn-sm"
          onClick={fetchSubstitutions}
        >
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      {/* 4 Summary Cards (MongoDB Real Data) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* TODAY */}
        <div
          className="dp-metric-card"
          onClick={() => setStatusFilter('TODAY')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'TODAY' ? 'var(--dp-primary)' : undefined }}
        >
          <div className="dp-metric-top">
            <span className="dp-metric-label">Today's Substitutions</span>
            <div className="dp-metric-icon-wrap" style={{ background: 'var(--dp-primary-soft)', color: 'var(--dp-primary)' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div className="dp-metric-value" style={{ color: 'var(--dp-primary)' }}>
            {metrics.todayCount}
          </div>
          <div className="dp-metric-subtext">Scheduled for today</div>
        </div>

        {/* PENDING */}
        <div
          className="dp-metric-card"
          onClick={() => setStatusFilter('PENDING')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'PENDING' ? 'var(--dp-primary)' : undefined }}
        >
          <div className="dp-metric-top">
            <span className="dp-metric-label">Pending Substitutions</span>
            <div className="dp-metric-icon-wrap" style={{ background: 'var(--dp-warning-soft)', color: 'var(--dp-warning)' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="dp-metric-value" style={{ color: 'var(--dp-warning)' }}>
            {metrics.pendingCount}
          </div>
          <div className="dp-metric-subtext">Awaiting action</div>
        </div>

        {/* ACTIVE / CONFIRMED */}
        <div
          className="dp-metric-card"
          onClick={() => setStatusFilter('CONFIRMED')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'CONFIRMED' ? 'var(--dp-primary)' : undefined }}
        >
          <div className="dp-metric-top">
            <span className="dp-metric-label">Active Substitutions</span>
            <div className="dp-metric-icon-wrap" style={{ background: 'var(--dp-success-soft)', color: 'var(--dp-success)' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="dp-metric-value" style={{ color: 'var(--dp-success)' }}>
            {metrics.activeCount}
          </div>
          <div className="dp-metric-subtext">Currently active</div>
        </div>

        {/* COMPLETED / CANCELLED */}
        <div
          className="dp-metric-card"
          onClick={() => setStatusFilter('CANCELLED')}
          style={{ cursor: 'pointer', borderColor: statusFilter === 'CANCELLED' ? 'var(--dp-primary)' : undefined }}
        >
          <div className="dp-metric-top">
            <span className="dp-metric-label">Completed Substitutions</span>
            <div className="dp-metric-icon-wrap">
              <ArrowRightLeft size={16} />
            </div>
          </div>
          <div className="dp-metric-value">
            {metrics.completedCount}
          </div>
          <div className="dp-metric-subtext">Completed or resolved</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="dp-filter-tabs">
        <button
          type="button"
          className={`dp-filter-tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
          onClick={() => setStatusFilter('ALL')}
        >
          All Substitutions
        </button>
        <button
          type="button"
          className={`dp-filter-tab-btn ${statusFilter === 'TODAY' ? 'active' : ''}`}
          onClick={() => setStatusFilter('TODAY')}
        >
          Today's Substitutions ({metrics.todayCount})
        </button>
        <button
          type="button"
          className={`dp-filter-tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
          onClick={() => setStatusFilter('PENDING')}
        >
          Pending Substitutions ({metrics.pendingCount})
        </button>
        <button
          type="button"
          className={`dp-filter-tab-btn ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('CONFIRMED')}
        >
          Active Substitutions ({metrics.activeCount})
        </button>
        <button
          type="button"
          className={`dp-filter-tab-btn ${statusFilter === 'CANCELLED' ? 'active' : ''}`}
          onClick={() => setStatusFilter('CANCELLED')}
        >
          Completed Substitutions ({metrics.completedCount})
        </button>
      </div>

      {/* Substitutions Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading substitutions registry...</span>
        </div>
      ) : substitutions.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <ArrowRightLeft size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Substitutions Found</div>
          <div className="dp-empty-desc">There are no substitution requests matching the selected filter.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {substitutions.map((sub) => {
            const time12h = `${sub.period?.startTime || ''} - ${sub.period?.endTime || ''}`;

            return (
              <div
                key={sub._id}
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
                  {/* Top Bar: Period & Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="dp-period-badge">{sub.period?.periodNumber || 'Period'}</span>
                      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--dp-secondary)' }}>
                        {time12h}
                      </span>
                    </div>
                    <span className={`dp-status-badge ${sub.status?.toLowerCase()}`}>
                      {formatAcademicStatus(sub.status, 'SUBSTITUTION')}
                    </span>
                  </div>

                  {/* Subject Name */}
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px 0', color: 'var(--dp-text)' }}>
                    {sub.subject?.name}
                  </h3>
                  <div style={{ fontSize: '0.82rem', color: 'var(--dp-secondary)', margin: '0 0 14px 0' }}>
                    <span style={{ color: 'var(--dp-muted)', marginRight: '4px' }}>Class:</span>
                    <strong style={{ color: 'var(--dp-text)' }}>
                      {formatAcademicSection(sub.section?.name, sub.section?.semester?.name)}
                    </strong>
                  </div>

                  {/* Faculty Handover Details */}
                  <div
                    style={{
                      background: 'var(--dp-surface)',
                      borderRadius: '8px',
                      padding: '12px',
                      border: '1px solid var(--dp-border)',
                      marginBottom: '14px',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <User size={14} style={{ color: 'var(--dp-muted)' }} />
                      <span style={{ color: 'var(--dp-secondary)' }}>Original Faculty:</span>
                      <strong>{sub.originalFaculty?.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <ArrowRightLeft size={14} style={{ color: 'var(--dp-primary)' }} />
                      <span style={{ color: 'var(--dp-secondary)' }}>Substitute Faculty:</span>
                      <strong style={{ color: 'var(--dp-primary)' }}>{sub.substituteFaculty?.fullName}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} style={{ color: 'var(--dp-muted)' }} />
                      <span style={{ color: 'var(--dp-secondary)' }}>Room:</span>
                      <strong>{sub.roomDetails?.roomNumber || sub.roomId || 'B314'}</strong>
                    </div>
                  </div>

                  {sub.reason && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--dp-muted)', fontStyle: 'italic', marginBottom: '16px' }}>
                      "{sub.reason}"
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    className="dp-btn dp-btn-outline dp-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (openEntityDrawer) {
                        openEntityDrawer({
                          id: sub._id,
                          category: 'SUBSTITUTION',
                          title: `Substitution — ${sub.subject?.name}`,
                          raw: sub
                        });
                      }
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>View Details</span>
                  </button>

                  <button
                    type="button"
                    className="dp-btn dp-btn-primary dp-btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => {
                      if (openModifyModal) {
                        openModifyModal(sub);
                      }
                    }}
                  >
                    <Edit size={14} />
                    <span>Modify</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DeanSubstitutionsPage;
