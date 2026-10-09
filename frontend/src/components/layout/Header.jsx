import React from 'react';
import { Sun, Moon, LogOut, Menu, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Link, useNavigate } from 'react-router-dom';

export const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className="btn-icon mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          id="btn-toggle-sidebar-mobile"
        >
          <Menu size={20} />
        </button>
        <div className="header-breadcrumbs">
          <span className="dept-tag">Computer Science Dept</span>
          <span className="dept-divider">/</span>
          <span className="app-title-tag">Academic Administration</span>
        </div>
      </div>

      <div className="header-right">
        {/* Theme Switcher */}
        <button
          type="button"
          className="btn-icon theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          id="btn-theme-toggle"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Admin Profile Chip */}
        <Link to="/admin/profile" className="header-user-chip" id="link-admin-profile">
          <div className="user-avatar">
            <User size={16} />
          </div>
          <div className="user-details">
            <span className="user-name">{user?.fullName || 'Administrator'}</span>
            <span className="user-role-badge">
              <Shield size={10} />
              {user?.role || 'ADMIN'}
            </span>
          </div>
        </Link>

        {/* Quick Logout Button */}
        <button
          type="button"
          className="btn-icon logout-btn"
          onClick={handleLogout}
          title="Sign Out"
          aria-label="Sign Out"
          id="btn-header-logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
