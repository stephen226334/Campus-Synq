import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  CalendarDays,
  Layers,
  DoorOpen,
  Cpu,
  Building2,
  Users,
  Clock,
  CalendarCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemClass = ({ isActive }) =>
    `sidebar-nav-link ${isActive ? 'active' : ''}`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div className="sidebar-mobile-backdrop" onClick={onCloseMobile} />
      )}

      <aside className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        {/* Brand Area */}
        <div className="sidebar-brand-container">
          <div className="sidebar-brand">
            <img src="/logo-icon.png" alt="Campus Synq Logo" className="brand-logo" width="40" height="40" />
            {!isCollapsed && (
              <div className="brand-text">
                <span className="brand-title">CAMPUS SYNQ</span>
                <span className="brand-subtitle">Admin Portal</span>
              </div>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-toggle desktop-only"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            id="btn-sidebar-collapse"
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {/* Main Dashboard */}
          <div className="sidebar-section">
            <NavLink to="/admin/dashboard" className={navItemClass} end onClick={onCloseMobile}>
              <LayoutDashboard size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Dashboard</span>}
            </NavLink>
          </div>

          {/* ACADEMIC */}
          <div className="sidebar-section">
            {!isCollapsed && <div className="sidebar-section-title">Academic</div>}

            <NavLink to="/admin/subjects" className={navItemClass} onClick={onCloseMobile}>
              <BookOpen size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Subjects</span>}
            </NavLink>

            <NavLink to="/admin/semesters" className={navItemClass} onClick={onCloseMobile}>
              <CalendarDays size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Semesters</span>}
            </NavLink>

            <NavLink to="/admin/class-sections" className={navItemClass} onClick={onCloseMobile}>
              <Layers size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Class Sections</span>}
            </NavLink>

            <NavLink to="/admin/classrooms" className={navItemClass} onClick={onCloseMobile}>
              <DoorOpen size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Classrooms</span>}
            </NavLink>

            <NavLink to="/admin/labs" className={navItemClass} onClick={onCloseMobile}>
              <Cpu size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Labs</span>}
            </NavLink>

            <NavLink to="/admin/auditoriums" className={navItemClass} onClick={onCloseMobile}>
              <Building2 size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Auditoriums</span>}
            </NavLink>
          </div>

          {/* PEOPLE */}
          <div className="sidebar-section">
            {!isCollapsed && <div className="sidebar-section-title">People</div>}

            <NavLink to="/admin/faculty" className={navItemClass} onClick={onCloseMobile}>
              <Users size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Faculty</span>}
            </NavLink>
          </div>

          {/* SCHEDULING */}
          <div className="sidebar-section">
            {!isCollapsed && <div className="sidebar-section-title">Scheduling</div>}

            <NavLink to="/admin/periods" className={navItemClass} onClick={onCloseMobile}>
              <Clock size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Periods</span>}
            </NavLink>

            <NavLink to="/admin/timetable" className={navItemClass} onClick={onCloseMobile}>
              <CalendarCheck size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Timetable</span>}
            </NavLink>
          </div>

          {/* ACCOUNT */}
          <div className="sidebar-section sidebar-bottom-section">
            {!isCollapsed && <div className="sidebar-section-title">Account</div>}

            <NavLink to="/admin/profile" className={navItemClass} onClick={onCloseMobile}>
              <User size={18} className="nav-icon" />
              {!isCollapsed && <span className="nav-label">Profile</span>}
            </NavLink>

            <button
              type="button"
              className="sidebar-nav-link sidebar-logout-btn"
              onClick={handleLogout}
              id="btn-sidebar-logout"
            >
              <LogOut size={18} className="nav-icon text-danger" />
              {!isCollapsed && <span className="nav-label">Logout</span>}
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
