import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Search,
  Users,
  BookOpen,
  DoorOpen,
  GraduationCap,
  Layers,
  Cpu,
  Tv,
  Calendar,
  ArrowRightLeft,
  UserCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const DeanSidebar = ({ mobileOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out successfully.', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const primaryNavLinks = [
    { to: '/dean/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/dean/class-search', label: 'Class Search', icon: Layers },
    { to: '/dean/room-search', label: 'Room Search', icon: DoorOpen },
    { to: '/dean/faculty-search', label: 'Faculty Search', icon: Users },
    { to: '/dean/free-rooms', label: 'Free Rooms', icon: Cpu },
    { to: '/dean/current-status', label: 'Current Status', icon: Search },
    { to: '/dean/timetable', label: 'Timetable', icon: Calendar },
    { to: '/dean/substitutions', label: 'Substitutions', icon: ArrowRightLeft }
  ];

  const inspectionLinks = [
    { to: '/dean/faculty', label: 'Faculty Directory', icon: Users },
    { to: '/dean/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/dean/classrooms', label: 'Classrooms', icon: DoorOpen },
    { to: '/dean/labs', label: 'Laboratories', icon: Cpu },
    { to: '/dean/auditoriums', label: 'Auditoriums', icon: Tv },
    { to: '/dean/semesters', label: 'Semesters', icon: GraduationCap },
    { to: '/dean/sections', label: 'Sections', icon: Layers }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="dp-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`dp-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="dp-sidebar-nav-container">
          {/* Section 1: Academic Overview */}
          <div className="dp-nav-section-title">ACADEMIC OVERVIEW</div>
          <nav className="dp-nav-list" aria-label="Dean Command Navigation">
            {primaryNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={`dp-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Section 2: Academic Directory */}
          <div className="dp-nav-section-title" style={{ marginTop: '12px' }}>
            ACADEMIC DIRECTORY
          </div>
          <nav className="dp-nav-list" aria-label="Academic Asset Oversight">
            {inspectionLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onCloseMobile}
                  className={`dp-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Section 3: Account */}
          <div className="dp-nav-section-title" style={{ marginTop: '12px' }}>
            ACCOUNT
          </div>
          <nav className="dp-nav-list" aria-label="Account Settings">
            <NavLink
              to="/dean/profile"
              onClick={onCloseMobile}
              className={`dp-nav-item ${location.pathname === '/dean/profile' ? 'active' : ''}`}
            >
              <UserCheck size={17} />
              <span>My Profile</span>
            </NavLink>
          </nav>
        </div>

        {/* Bottom: Profile & Logout */}
        <div className="dp-sidebar-bottom">
          <NavLink
            to="/dean/profile"
            className="dp-sidebar-mini-profile"
            onClick={onCloseMobile}
            title="Dean Profile"
          >
            <div className="dp-header-avatar">
              {(user?.fullName || 'D')[0].toUpperCase()}
            </div>
            <div className="dp-header-user-meta">
              <span className="dp-header-user-name">{user?.fullName || 'Prof. Robert Vance'}</span>
              <span className="dp-header-user-role">Dean / HOD</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="dp-sidebar-logout-btn"
            onClick={handleLogout}
            id="btn-dean-sidebar-logout"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default DeanSidebar;
