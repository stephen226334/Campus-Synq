import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Moon, Sun, LogOut, Menu, X, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const DeanHeader = ({ onToggleMobileSidebar, mobileSidebarOpen, onOpenSearch }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());

  // Auto-ticking live clock (updates every 1000ms, strictly 12-hour format)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out from Dean Portal.', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  // 12-hour format strictly without seconds: "10:35 PM" (never 24h)
  const formattedTime12h = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <header className="dp-header">
      {/* Left: Brand + Computer Science Department + Badge */}
      <div className="dp-header-left">
        <button
          type="button"
          className="dp-mobile-toggle-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/dean/dashboard" className="dp-header-brand">
          <img src="/logo-icon.png" alt="Campus Synq" className="dp-header-logo" />
          <div className="dp-header-titles">
            <span className="dp-brand-title">CampusSynq</span>
            <span className="dp-brand-dept">Computer Science Department</span>
          </div>
        </Link>

        <span className="dp-badge-portal">DEAN / HOD</span>
      </div>

      {/* Center: Dean / Academic Administration */}
      <div className="dp-header-center">
        <span className="dp-header-center-title">Dean / Academic Administration</span>
      </div>

      {/* Right: Quick Search, Date/Time, Dark Mode, Profile, Logout */}
      <div className="dp-header-right">
        {/* Global Search Quick Trigger */}
        <button
          type="button"
          className="dp-header-search-trigger"
          onClick={() => {
            if (onOpenSearch) onOpenSearch();
            else navigate('/dean/search');
          }}
          title="Search anything (Faculty, Subjects, Rooms, Sections...)"
        >
          <Search size={15} />
          <span>Search...</span>
          <kbd>⌘K</kbd>
        </button>

        {/* Dynamic 12-Hour Clock */}
        <div className="dp-header-clock" title={`Current Date: ${formattedDate}`}>
          <Clock size={15} style={{ color: 'var(--dp-primary)' }} />
          <span>{formattedTime12h}</span>
        </div>

        {/* Theme Switcher */}
        <button
          type="button"
          className="dp-header-btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          id="btn-dp-theme-toggle"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Dean Profile Chip */}
        <Link to="/dean/profile" className="dp-header-user-chip" title="Dean Profile">
          <div className="dp-header-avatar">
            {(user?.fullName || 'D')[0].toUpperCase()}
          </div>
          <div className="dp-header-user-meta">
            <span className="dp-header-user-name">{user?.fullName || 'Dr. R Kumar'}</span>
            <span className="dp-header-user-role">Dean Office</span>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          type="button"
          className="dp-header-btn-icon"
          onClick={handleLogout}
          title="Sign Out"
          id="btn-dp-logout"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
};

export default DeanHeader;
