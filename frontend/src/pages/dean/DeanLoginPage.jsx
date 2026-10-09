import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  Clock, 
  Calendar,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const DeanLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  const { login, user, isAuthenticated } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Central live clock in 12-hour format
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      setCurrentTime(`${hours}:${minutes}:${seconds} ${ampm}`);

      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      setCurrentDate(`${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Redirect if already authenticated as Dean
  useEffect(() => {
    if (isAuthenticated && user?.role === 'DEAN') {
      navigate('/dean/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please provide both official Dean email and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await login(email.trim(), password);
      
      const loggedInUser = res?.user;
      if (loggedInUser?.role !== 'DEAN') {
        setError('Access denied: This credential does not hold Dean / Academic Administration oversight authorization.');
        setLoading(false);
        return;
      }

      navigate('/dean/dashboard', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Invalid Dean credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`dp-login-container ${isDark ? 'dark' : ''}`}>
      <div className="dp-login-card">
        {/* Brand Header */}
        <div className="dp-login-brand">
          <div className="dp-login-badge-icon">
            <Building2 size={28} className="dp-login-icon" />
          </div>
          <span className="dp-login-tag">Academic Administration Portal</span>
          <h1 className="dp-login-title">CampusSynq</h1>
          <p className="dp-login-subtitle">Computer Science Department • Executive Oversight</p>
        </div>

        {/* Live Clock Strip */}
        <div className="dp-login-clock-strip">
          <div className="dp-login-clock-item">
            <Clock size={14} />
            <span>{currentTime || '10:00:00 AM'}</span>
          </div>
          <div className="dp-login-clock-item">
            <Calendar size={14} />
            <span>{currentDate || 'Academic Session 2026-2027'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="dp-login-alert" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="dp-login-form">
          <div className="dp-input-group">
            <label htmlFor="dean-email">Official Dean Email</label>
            <div className="dp-input-wrapper">
              <Mail size={18} className="dp-field-icon" />
              <input
                id="dean-email"
                type="email"
                autoComplete="email"
                placeholder="dean@campussynq.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="dp-input-group">
            <label htmlFor="dean-password">Executive Password</label>
            <div className="dp-input-wrapper">
              <Lock size={18} className="dp-field-icon" />
              <input
                id="dean-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                className="dp-btn-toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                id="btn-toggle-dean-password"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="dp-btn-login"
            disabled={loading}
            id="btn-dean-login-submit"
          >
            {loading ? (
              <span className="dp-btn-spinner-text">Authenticating Dean Credentials...</span>
            ) : (
              <>
                <span>Access Dean Dashboard</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="dp-login-footer">
          <div className="dp-security-notice">
            <ShieldCheck size={14} />
            <span>Protected by Strict Role-Based Access Control (DEAN)</span>
          </div>
          <div className="dp-alt-portal-link">
            <span>Faculty or Staff? </span>
            <Link to="/login">Go to Standard Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeanLoginPage;
