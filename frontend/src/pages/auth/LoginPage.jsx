import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sun, Moon, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, isInitialized } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdminLoginRoute = location.pathname === '/admin/login' || location.pathname.startsWith('/admin');

  const validate = () => {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const loggedUser = await login(email.trim(), password);
      showToast('Welcome back! Signed in successfully.', 'success');
      const rawFrom = location.state?.from?.pathname;
      const isAuthRoute = !rawFrom || rawFrom === '/login' || rawFrom === '/admin/login' || rawFrom === '/faculty/login' || rawFrom === '/dean/login';

      if (loggedUser?.role === 'DEAN') {
        navigate(isAuthRoute ? '/dean/dashboard' : rawFrom, { replace: true });
      } else if (loggedUser?.role === 'FACULTY' || loggedUser?.role === 'HOD_FACULTY') {
        navigate(isAuthRoute ? '/faculty/dashboard' : rawFrom, { replace: true });
      } else if (loggedUser?.role === 'ADMIN') {
        navigate(isAuthRoute ? '/admin/dashboard' : rawFrom, { replace: true });
      } else {
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setErrors({ form: msg });
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Visual / Brand Panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-overlay"></div>
        <img
          src="/auth-hero.jpg"
          alt="Campus Synq Computing Hub"
          className="auth-brand-bg-image"
        />

        <div className="auth-brand-content">
          <div className="brand-badge-pill">
            <span className="pill-dot"></span>
            <span>Computer Science Department</span>
          </div>

          <div className="brand-hero-title">
            <img src="/logo-icon.png" alt="Campus Synq" className="auth-logo-hero" width="56" height="42" />
            <h1>CAMPUS SYNQ</h1>
          </div>

          <p className="auth-hero-tagline">
            Next-generation academic administration and faculty timetable platform. Streamlining classroom scheduling, real-time sessions, and faculty substitution.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <ShieldCheck size={20} className="feature-icon" />
              <div>
                <strong>Role-Based Access Control</strong>
                <p>Dedicated authenticated portals for Faculty and Department Administration.</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <Lock size={20} className="feature-icon" />
              <div>
                <strong>Real-Time Timetable & Substitution</strong>
                <p>Instant schedule tracking, conflict detection, and academic session management.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="auth-panel-topbar">
          <button
            type="button"
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            id="btn-auth-theme-toggle"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <img src="/logo-icon.png" alt="Campus Synq" className="brand-logo" width="36" height="36" />
            <div className="brand-text">
              <span className="brand-title">CAMPUS SYNQ</span>
              <span className="brand-subtitle">Department Portal</span>
            </div>
          </div>
          <div className="auth-form-header">
            <span className="auth-step-pill">
              {isAdminLoginRoute ? 'Administrator Authentication' : 'Secure Authentication'}
            </span>
            <h2 className="auth-title">
              {isAdminLoginRoute ? 'Department Administration' : 'Welcome to Campus Synq'}
            </h2>
            <p className="auth-subtitle">
              {isAdminLoginRoute
                ? 'Sign in with your administrator credentials to access the academic administration portal.'
                : 'Sign in with your official academic credentials to access your designated portal.'}
            </p>
          </div>

          {errors.form && (
            <div className="alert-box alert-error" role="alert">
              <span>{errors.form}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Official Email Address <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  className={`form-input has-icon ${errors.email ? 'error' : ''}`}
                  placeholder={isAdminLoginRoute ? 'admin@campussynq.com' : 'faculty@campussynq.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>
              {errors.email && <span className="form-error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Password <span className="required">*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input has-icon has-trailing ${errors.password ? 'error' : ''}`}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="trailing-icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  id="btn-toggle-password"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="form-error-msg">{errors.password}</span>}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-auth-submit"
              disabled={isSubmitting}
              id="btn-login-submit"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {!isInitialized && (
            <div className="auth-footer-notice">
              <p>System not yet initialized with an administrator?</p>
              <Link to="/signup" className="auth-link" id="link-goto-initial-signup">
                Register Initial Administrator Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
