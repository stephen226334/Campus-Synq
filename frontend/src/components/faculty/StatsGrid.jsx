import React from 'react';
import { BookOpen, Users, Calendar, Clock } from 'lucide-react';
import StatCard from './StatCard';

export const StatsGrid = ({ stats, todayDayName }) => {
  return (
    <section className="fp-stats-grid" aria-label="Faculty Academic Metrics">
      <StatCard
        icon={BookOpen}
        colorTheme="purple"
        label="ASSIGNED SUBJECTS"
        value={stats?.assignedSubjectsCount ?? 0}
        subtext="Curriculum courses"
      />

      <StatCard
        icon={Users}
        colorTheme="blue"
        label="ASSIGNED SECTIONS"
        value={stats?.assignedSectionsCount ?? 0}
        subtext="Student cohorts"
      />

      <StatCard
        icon={Calendar}
        colorTheme="emerald"
        label="TODAY'S CLASSES"
        value={stats?.todayClassesCount ?? 0}
        subtext={`Scheduled ${todayDayName || 'today'}`}
      />

      <StatCard
        icon={Clock}
        colorTheme="amber"
        label="WEEKLY CLASSES"
        value={stats?.weeklyClassesCount ?? 0}
        subtext="Total weekly periods"
      />
    </section>
  );
};

export default StatsGrid;
