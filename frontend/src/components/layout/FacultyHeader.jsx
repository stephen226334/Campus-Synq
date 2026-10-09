import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Moon, Sun, LogOut, Menu, X, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export const FacultyHeader = ({ onToggleMobileSidebar, mobileSidebarOpen }) => {
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
      showToast('Signed out successfully.', 'info');
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  // Strictly 12-hour format e.g. "5:56 PM"
  const formattedTime12h = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const formattedDate = currentTime.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="fp-header">
      {/* Left: Brand + Dept + Badge */}
      <div className="fp-header-left">
        <button
          type="button"
          className="fp-mobile-toggle-btn"
          onClick={onToggleMobileSidebar}
          aria-label="Toggle Navigation"
        >
          {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/faculty/dashboard" className="fp-header-brand">
          <img src="/logo-icon.png" alt="Campus Synq" className="fp-header-logo" />
          <div className="fp-header-titles">
            <span className="fp-brand-title">CAMPUS SYNQ</span>
            <span className="fp-brand-dept">Computer Science Department</span>
          </div>
        </Link>

        <span className="fp-badge-portal">Faculty Portal</span>
      </div>

      {/* Right: Clock, Theme, Profile, Logout */}
      <div className="fp-header-right">
        {/* Compact Auto-Ticking 12-Hour Clock */}
        <div className="fp-header-clock" title="Current Academic Time">
          <Clock size={15} className="fp-clock-icon" />
          <span className="fp-clock-time">{formattedDate} • {formattedTime12h}</span>
        </div>

        {/* Dark Mode Switcher */}
        <button
          type="button"
          className="fp-header-btn-icon"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          id="btn-fp-theme-toggle"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Profile Chip */}
        <Link to="/faculty/profile" className="fp-header-user-chip" title="View Profile">
          <div className="fp-header-avatar">
            {(user?.fullName || 'F')[0].toUpperCase()}
          </div>
          <div className="fp-header-user-meta">
            <span className="fp-header-user-name">{user?.fullName || 'Faculty'}</span>
            <span className="fp-header-user-role">{user?.designation || user?.role || 'Faculty'}</span>
          </div>
        </Link>

        {/* Sign Out */}
        <button
          type="button"
          className="fp-header-btn-icon"
          onClick={handleLogout}
          title="Sign Out"
          id="btn-fp-logout"
        >
          <LogOut size={17} />
        </button>
      </div>
    </header>
  );
};

export default FacultyHeader;
