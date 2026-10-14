import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';

// Reusable Faculty Components
import WelcomeCard from '../../components/faculty/WelcomeCard';
import ClassSpotlightRow from '../../components/faculty/ClassSpotlightRow';
import StatsGrid from '../../components/faculty/StatsGrid';
import TodaySchedule from '../../components/faculty/TodaySchedule';
import SubstitutionCard from '../../components/faculty/SubstitutionCard';
import FacultyInfoCard from '../../components/faculty/FacultyInfoCard';
import SubstitutionModal from '../../components/faculty/SubstitutionModal';
import { parseTimeToMinutes, sortTimetableEntries } from '../../utils/timetableSort';

export const FacultyDashboardPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [substitutions, setSubstitutions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Substitution modal state
  const [selectedSessionForSub, setSelectedSessionForSub] = useState(null);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);

  // Avoid alert notification spam
  const [lastNotifiedPeriod, setLastNotifiedPeriod] = useState(null);

  // Fetch live dashboard & substitution data from MongoDB
  const loadDashboard = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const [dashRes, subRes] = await Promise.all([
        facultyApi.getDashboard(),
        facultyApi.getSubstitutions().catch(() => ({ data: [] }))
      ]);

      if (dashRes && dashRes.data) {
        setDashboardData(dashRes.data);
      }
      if (subRes && subRes.data) {
        setSubstitutions(subRes.data);
      }
    } catch (err) {
      console.error('Failed to load faculty dashboard:', err);
      setError(err.message || 'Unable to load academic timetable. Please click Retry.');
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Real-time SSE listener
  const handleRealtimeEvent = useCallback(
    (eventType) => {
      loadDashboard(true);
      if (eventType === 'SUBSTITUTION_UPDATED') {
        showToast('Timetable schedule updated via real-time sync.', 'info');
      }
    },
    [loadDashboard, showToast]
  );

  useRealtimeEvents(handleRealtimeEvent);

  // Real-time ticking clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Recompute current class & next class dynamically in strict chronological order
  const dynamicClasses = useMemo(() => {
    if (!dashboardData?.todaySchedule) {
      return { currentClass: null, nextClass: null, processedSchedule: [] };
    }

    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let current = null;
    let next = null;

    const sortedSchedule = sortTimetableEntries(dashboardData.todaySchedule);

    const processedSchedule = sortedSchedule.map((session) => {
      const startMin = parseTimeToMinutes(session.period?.startTime);
      const endMin = parseTimeToMinutes(session.period?.endTime);

      let statusLabel = 'UPCOMING';
      let minutesUntilStart = null;
      let minutesRemaining = null;

      if (startMin !== Number.MAX_SAFE_INTEGER && endMin !== Number.MAX_SAFE_INTEGER) {
        if (currentMinutes >= startMin && currentMinutes < endMin) {
          statusLabel = 'CURRENT';
          minutesRemaining = endMin - currentMinutes;
        } else if (currentMinutes < startMin) {
          statusLabel = 'UPCOMING';
          minutesUntilStart = startMin - currentMinutes;
        } else {
          statusLabel = 'COMPLETED';
        }
      }

      const item = {
        ...session,
        statusLabel,
        minutesUntilStart,
        minutesRemaining,
        isApproaching: minutesUntilStart !== null && minutesUntilStart > 0 && minutesUntilStart <= 15
      };

      if (statusLabel === 'CURRENT' && !current) {
        current = item;
      }
      if (statusLabel === 'UPCOMING' && !next) {
        next = item;
      }

      return item;
    });

    return { currentClass: current, nextClass: next, processedSchedule };
  }, [dashboardData, currentTime]);

  // Approaching class notification toast (15 min warning)
  useEffect(() => {
    const next = dynamicClasses.nextClass;
    if (next && next.isApproaching && lastNotifiedPeriod !== next.period?.periodNumber) {
      showToast(
        `Upcoming Class: ${next.subject?.name || 'Class'} (${next.section?.name || ''}) starts in ${next.minutesUntilStart} minutes in Room ${next.roomDetails?.roomNumber || ''}.`,
        'info'
      );
      setLastNotifiedPeriod(next.period?.periodNumber);
    }
  }, [dynamicClasses.nextClass, lastNotifiedPeriod, showToast]);

  const handleOpenSubstitution = (session) => {
    setSelectedSessionForSub(session);
    setIsSubModalOpen(true);
  };

  const handleSubstitutionSuccess = () => {
    loadDashboard(true);
  };

  if (isLoading) {
    return (
      <div style={{ padding: '24px 0' }}>
        <LoadingSkeleton message="Loading your faculty academic dashboard..." rows={5} cols={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="fp-stat-card" style={{ textAlign: 'center', padding: '36px 20px', alignItems: 'center' }}>
        <AlertTriangle size={36} style={{ color: 'var(--fp-danger)', marginBottom: '8px' }} />
        <h3 style={{ margin: '4px 0', color: 'var(--fp-text)' }}>Unable to load dashboard</h3>
        <p style={{ color: 'var(--fp-secondary)', marginBottom: '16px' }}>{error}</p>
        <button type="button" className="fp-btn-primary" onClick={() => loadDashboard(false)}>
          <RefreshCw size={15} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  const { stats, faculty } = dashboardData || {};
  const { currentClass, nextClass, processedSchedule } = dynamicClasses;

  const currentDayName = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
  const currentFullDate = currentTime.toLocaleDateString('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric'
  });

  return (
    <>
      {/* 1. WELCOME + TODAY HERO CARD */}
      <WelcomeCard
        facultyName={faculty?.fullName || user?.fullName}
        designation={faculty?.designation || user?.designation}
        department={faculty?.department || 'Department of Computer Science'}
      />

      {/* 2. CURRENT CLASS + NEXT CLASS (Side-by-Side Spotlight) */}
      <ClassSpotlightRow
        currentClass={currentClass}
        nextClass={nextClass}
        onOpenSubstitution={handleOpenSubstitution}
      />

      {/* 3. STATISTICS CARDS (4 Column Grid) */}
      <StatsGrid
        stats={stats}
        todayDayName={currentDayName}
      />

      {/* 4. TODAY'S SCHEDULE (Primary Large Section) */}
      <TodaySchedule
        schedule={processedSchedule}
        dayName={currentDayName}
        fullDateStr={currentFullDate}
        onOpenSubstitution={handleOpenSubstitution}
      />

      {/* 5. SUBSTITUTIONS / FACULTY INFORMATION (Split Row) */}
      <div className="fp-bottom-split-row">
        <SubstitutionCard substitutions={substitutions} />
        <FacultyInfoCard faculty={faculty || user} />
      </div>

      {/* Substitution Modal Dialog (Centered 540px) */}
      <SubstitutionModal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        session={selectedSessionForSub}
        onSuccess={handleSubstitutionSuccess}
      />
    </>
  );
};

export default FacultyDashboardPage;
