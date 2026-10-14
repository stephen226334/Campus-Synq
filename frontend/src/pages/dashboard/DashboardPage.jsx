import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  CalendarDays,
  Layers,
  DoorOpen,
  Cpu,
  Building2,
  Users,
  CalendarCheck,
  Clock,
  RefreshCw,
  Plus,
  ArrowRight,
  User,
  MapPin
} from 'lucide-react';
import api from '../../api/client';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import { useToast } from '../../context/ToastContext';
import { sortTimetableEntries } from '../../utils/timetableSort';

// 12-hour time format helper ensuring no 24h clock strings display
const formatTime12h = (time) => {
  if (!time) return '';
  const trimmed = String(time).trim();
  if (/am|pm/i.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return trimmed;
  let [_, hours, minutes] = match;
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${minutes} ${ampm}`;
};

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/dashboard');
      if (res && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard statistics', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const counts = stats?.counts || {
    // Stage 1
    subjects: 0,
    semesters: 0,
    classSections: 0,
    classrooms: 0,
    labs: 0,
    auditoriums: 0,
    // Stage 2
    totalFaculty: 0,
    activeFaculty: 0,
    totalTimetableEntries: 0,
    todayClassesCount: 0
  };

  const rawSchedule = stats?.todaySchedule || { weekday: '', classes: [] };
  const todaySchedule = {
    ...rawSchedule,
    classes: sortTimetableEntries(rawSchedule.classes || [])
  };
  const recentSubjects = stats?.recentData?.subjects || [];
  const recentClassrooms = stats?.recentData?.classrooms || [];
  const recentSections = stats?.recentData?.sections || [];

  return (
    <div className="dashboard-page">
      {/* Dashboard Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">
            Computer Science Department academic administration, faculty allocation, and scheduling overview.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm refresh-btn"
            onClick={fetchDashboardData}
            disabled={isLoading}
            id="btn-refresh-dashboard"
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary Academic Operations Overview Cards (4-Column Grid) */}
      <div className="stats-grid-primary">
        <StatCard
          title="Total Faculty"
          count={counts.totalFaculty}
          icon={Users}
          linkTo="/admin/faculty"
          color="purple"
        />
        <StatCard
          title="Active Faculty"
          count={counts.activeFaculty}
          icon={Users}
          linkTo="/admin/faculty"
          color="green"
        />
        <StatCard
          title="Timetable Sessions"
          count={counts.totalTimetableEntries}
          icon={CalendarCheck}
          linkTo="/admin/timetable"
          color="blue"
        />
        <StatCard
          title={`Today's Classes (${todaySchedule.weekday || 'Today'})`}
          count={counts.todayClassesCount}
          icon={Clock}
          linkTo="/admin/timetable"
          color="green"
        />
      </div>

      {/* Secondary Master Data Cards (6-Column Grid) */}
      <div className="stats-grid-secondary">
        <StatCard
          title="Subjects"
          count={counts.subjects}
          icon={BookOpen}
          linkTo="/admin/subjects"
          color="purple"
        />
        <StatCard
          title="Semesters"
          count={counts.semesters}
          icon={CalendarDays}
          linkTo="/admin/semesters"
          color="blue"
        />
        <StatCard
          title="Class Sections"
          count={counts.classSections}
          icon={Layers}
          linkTo="/admin/class-sections"
          color="purple"
        />
        <StatCard
          title="Classrooms"
          count={counts.classrooms}
          icon={DoorOpen}
          linkTo="/admin/classrooms"
          color="green"
        />
        <StatCard
          title="Labs"
          count={counts.labs}
          icon={Cpu}
          linkTo="/admin/labs"
          color="blue"
        />
        <StatCard
          title="Auditoriums"
          count={counts.auditoriums}
          icon={Building2}
          linkTo="/admin/auditoriums"
          color="orange"
        />
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions-bar card">
        <span className="quick-actions-label">Quick Actions:</span>
        <div className="quick-actions-buttons">
          <Link to="/admin/faculty" className="btn btn-primary btn-sm" id="btn-quick-add-faculty">
            <Plus size={14} /> Add Faculty
          </Link>
          <Link to="/admin/timetable" className="btn btn-secondary btn-sm" id="btn-quick-schedule-class">
            <Plus size={14} /> Schedule Class
          </Link>
          <Link to="/admin/periods" className="btn btn-secondary btn-sm" id="btn-quick-add-period">
            <Plus size={14} /> Add Period
          </Link>
          <Link to="/admin/subjects" className="btn btn-secondary btn-sm" id="btn-quick-add-subject">
            <Plus size={14} /> Add Subject
          </Link>
          <Link to="/admin/semesters" className="btn btn-secondary btn-sm" id="btn-quick-add-semester">
            <Plus size={14} /> Add Semester
          </Link>
        </div>
      </div>

      {/* TODAY'S CLASSES SECTION */}
      <div className="card schedule-overview-card">
        <div className="card-header schedule-card-header">
          <div>
            <h3 className="schedule-header-title">
              Today's Lectures & Labs — {todaySchedule.weekday || 'Monday'}
            </h3>
            <p className="schedule-header-subtitle">
              Live real-time schedule for the current date based on MongoDB database records.
            </p>
          </div>
          <Link to="/admin/timetable" className="card-header-link" id="link-manage-timetable">
            Manage Timetable <ArrowRight size={14} />
          </Link>
        </div>

        <div className="card-body schedule-card-body">
          {isLoading ? (
            <LoadingSkeleton rows={4} cols={6} />
          ) : todaySchedule.classes.length === 0 ? (
            <div className="schedule-empty-state">
              <Clock size={36} className="schedule-empty-icon" />
              <h4 className="schedule-empty-title">
                No academic sessions scheduled for {todaySchedule.weekday || 'today'}
              </h4>
              <p className="schedule-empty-desc">
                Classes scheduled on {todaySchedule.weekday || 'this day'} in the timetable will appear here automatically.
              </p>
              <Link to="/admin/timetable" className="btn btn-primary btn-sm">
                <Plus size={14} /> Schedule Session
              </Link>
            </div>
          ) : (
            <div className="table-responsive-wrapper">
              <table className="data-table today-schedule-table">
                <thead>
                  <tr>
                    <th>Period Slot</th>
                    <th>Time Interval</th>
                    <th>Subject Course</th>
                    <th>Assigned Faculty</th>
                    <th>Cohort / Section</th>
                    <th>Room Venue</th>
                  </tr>
                </thead>
                <tbody>
                  {todaySchedule.classes.map((cls) => (
                    <tr key={cls._id}>
                      <td>
                        <span className="period-slot-badge">{cls.period?.periodNumber || 'Unassigned'}</span>
                      </td>
                      <td className="time-interval-text">
                        {cls.period?.startTime && cls.period?.endTime
                          ? `${formatTime12h(cls.period.startTime)} - ${formatTime12h(cls.period.endTime)}`
                          : (cls.period?.startTime ? formatTime12h(cls.period.startTime) : 'Time Unspecified')}
                      </td>
                      <td>
                        <div className="subject-display-cell">
                          <span className="subject-name">{cls.subject?.name}</span>
                          <span className="subject-code font-mono">{cls.subject?.code}</span>
                        </div>
                      </td>
                      <td>
                        <div className="faculty-display-cell">
                          <div className="table-avatar">
                            <User size={13} />
                          </div>
                          <span className="faculty-name">{cls.faculty?.fullName}</span>
                        </div>
                      </td>
                      <td>
                        <span className="cohort-badge">
                          {cls.semester?.name} • {cls.section?.name}
                        </span>
                      </td>
                      <td>
                        <div className="room-venue-cell">
                          <MapPin size={14} className="room-pin-icon" />
                          <span className="room-number">
                            {cls.roomDetails?.roomNumber}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Records Section */}
      <div className="recent-records-grid">
        {/* Recent Subjects */}
        <div className="card recent-table-card">
          <div className="card-header">
            <h3>Recent Subjects</h3>
            <Link to="/admin/subjects" className="card-header-link">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSkeleton rows={3} cols={4} />
            ) : recentSubjects.length === 0 ? (
              <EmptyState
                title="No subjects created yet"
                description="Add courses like Data Structures, DBMS, AI."
                actionLabel="Create Subject"
                onAction={() => {}}
              />
            ) : (
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Semester</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubjects.map((sub) => (
                      <tr key={sub._id}>
                        <td className="font-medium">{sub.name}</td>
                        <td>
                          <span className="code-badge">{sub.code}</span>
                        </td>
                        <td>{sub.semester?.name || 'Unassigned'}</td>
                        <td>
                          <Badge status={sub.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Classrooms */}
        <div className="card recent-table-card">
          <div className="card-header">
            <h3>Recent Classrooms</h3>
            <Link to="/admin/classrooms" className="card-header-link">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSkeleton rows={3} cols={3} />
            ) : recentClassrooms.length === 0 ? (
              <EmptyState
                title="No classrooms created yet"
                description="Register academic lecture halls and rooms."
                actionLabel="Create Classroom"
                onAction={() => {}}
              />
            ) : (
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Room Number</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentClassrooms.map((room) => (
                      <tr key={room._id}>
                        <td className="font-medium">{room.roomNumber}</td>
                        <td>{room.capacity} students</td>
                        <td>
                          <Badge status={room.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Recent Sections */}
        <div className="card recent-table-card">
          <div className="card-header">
            <h3>Recent Class Sections</h3>
            <Link to="/admin/class-sections" className="card-header-link">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSkeleton rows={3} cols={3} />
            ) : recentSections.length === 0 ? (
              <EmptyState
                title="No class sections created yet"
                description="Organize student batches into sections (e.g. Section A, Section B)."
                actionLabel="Create Section"
                onAction={() => {}}
              />
            ) : (
              <div className="table-responsive-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Section</th>
                      <th>Semester</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSections.map((sec) => (
                      <tr key={sec._id}>
                        <td className="font-medium">{sec.name}</td>
                        <td>{sec.semester?.name || 'Unassigned'}</td>
                        <td>
                          <Badge status={sec.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
