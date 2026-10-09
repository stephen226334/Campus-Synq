import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  Calendar,
  ArrowRightLeft,
  User,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const FacultySidebar = ({ mobileOpen, onCloseMobile }) => {
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

  const navItems = [
    { to: '/faculty/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/faculty/timetable', label: "Today's Timetable", icon: CalendarDays },
    {
      to: '/faculty/weekly-schedule',
      altTo: '/faculty/weekly',
      label: 'Weekly Schedule',
      icon: Calendar
    },
    { to: '/faculty/substitutions', label: 'Substitutions', icon: ArrowRightLeft },
    { to: '/faculty/profile', label: 'My Profile', icon: User }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="fp-sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`fp-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Navigation list */}
        <nav className="fp-nav-list" aria-label="Faculty Navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.to ||
              (item.altTo && location.pathname === item.altTo) ||
              (item.exact && location.pathname === item.to);

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onCloseMobile}
                className={`fp-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: Profile Mini-Card & Logout */}
        <div className="fp-sidebar-bottom">
          <NavLink
            to="/faculty/profile"
            className="fp-sidebar-mini-profile"
            onClick={onCloseMobile}
            title="View Faculty Profile"
          >
            <div className="fp-mini-avatar">
              {(user?.fullName || 'F')[0].toUpperCase()}
            </div>
            <div className="fp-mini-info">
              <span className="fp-mini-name">{user?.fullName || 'Faculty Member'}</span>
              <span className="fp-mini-dept">{user?.designation || 'Computer Science'}</span>
            </div>
          </NavLink>

          <button
            type="button"
            className="fp-sidebar-logout-btn"
            onClick={handleLogout}
            id="btn-sidebar-logout"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default FacultySidebar;
