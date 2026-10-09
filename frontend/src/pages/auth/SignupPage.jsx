import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, ShieldAlert, Sun, Moon, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';

export const SignupPage = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signup, isInitialized } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const validate = () => {
    const errs = {};
    if (!fullName.trim()) {
      errs.fullName = 'Full name is required';
    } else if (fullName.trim().length < 2) {
      errs.fullName = 'Full name must be at least 2 characters';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email address';
    }

    if (!password) {
      errs.password = 'Password is required';
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters long';
    }

    if (!confirmPassword) {
      errs.confirmPassword = 'Password confirmation is required';
    } else if (confirmPassword !== password) {
      errs.confirmPassword = 'Passwords do not match';
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
      await signup(fullName.trim(), email.trim(), password, confirmPassword);
      showToast('Administrator account created successfully! Welcome to Campus Synq.', 'success');
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your inputs.';
      setErrors({ form: msg });
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Form Panel (Reversed layout for Signup) */}
      <div className="auth-form-panel">
        <div className="auth-panel-topbar">
          <Link to="/login" className="back-link" id="link-back-to-login">
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>
          <button
            type="button"
            className="btn-icon theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            id="btn-signup-theme-toggle"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>

        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <img src="/logo-icon.png" alt="Campus Synq" className="brand-logo" width="36" height="36" />
            <div className="brand-text">
              <span className="brand-title">CAMPUS SYNQ</span>
              <span className="brand-subtitle">Admin Portal</span>
            </div>
          </div>
          <div className="auth-form-header">
            <span className="auth-step-pill">Initial Setup</span>
            <h2 className="auth-title">Create Admin Account</h2>
            <p className="auth-subtitle">
              Register the root administrator credentials to initialize the Campus Synq system.
            </p>
          </div>

          {isInitialized ? (
            <div className="admin-lock-card card" role="alert">
              <div className="lock-icon-wrapper">
                <ShieldAlert size={36} className="text-warning" />
              </div>
              <h3>Registration Locked</h3>
              <p>
                An administrator account has already been registered for this installation. Additional administrator accounts cannot be publicly registered.
              </p>
              <Link to="/login" className="btn btn-primary" id="btn-locked-return-login">
                Return to Admin Login
              </Link>
            </div>
          ) : (
            <>
              {errors.form && (
                <div className="alert-box alert-error" role="alert">
                  <span>{errors.form}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form" noValidate>
                <div className="form-group">
                  <label htmlFor="signup-name" className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <User size={18} className="input-icon" />
                    <input
                      id="signup-name"
                      type="text"
                      className={`form-input has-icon ${errors.fullName ? 'error' : ''}`}
                      placeholder="Dr. Alan Turing"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.fullName && <span className="form-error-msg">{errors.fullName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="signup-email" className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" />
                    <input
                      id="signup-email"
                      type="email"
                      className={`form-input has-icon ${errors.email ? 'error' : ''}`}
                      placeholder="admin@campussynq.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.email && <span className="form-error-msg">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="signup-password" className="form-label">
                    Password <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input has-icon has-trailing ${errors.password ? 'error' : ''}`}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="trailing-icon-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      id="btn-toggle-signup-password"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <span className="form-error-msg">{errors.password}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="signup-confirm-password" className="form-label">
                    Confirm Password <span className="required">*</span>
                  </label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input
                      id="signup-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input has-icon ${errors.confirmPassword ? 'error' : ''}`}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.confirmPassword && (
                    <span className="form-error-msg">{errors.confirmPassword}</span>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-auth-submit"
                  disabled={isSubmitting}
                  id="btn-signup-submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="spinner" size={18} />
                      <span>Creating Admin Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="auth-footer-notice">
            <p>Already have an admin account?</p>
            <Link to="/login" className="auth-link" id="link-goto-login">
              Sign In to Admin Portal
            </Link>
          </div>
        </div>
      </div>

      {/* Visual Side */}
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
            <span>Security Enforcement</span>
          </div>

          <div className="brand-hero-title">
            <img src="/logo-icon.png" alt="Campus Synq" className="auth-logo-hero" width="56" height="42" />
            <h1>CAMPUS SYNQ</h1>
          </div>

          <p className="auth-hero-tagline">
            Establishing the foundational administrative boundary for the Computer Science Department.
          </p>

          <div className="auth-security-bullet">
            <h4>Initial Setup Security Policy</h4>
            <ul>
              <li>The initial administrator account has unconditional system access.</li>
              <li>Once created, the public setup portal automatically locks down.</li>
              <li>All cryptographic keys are salted and hashed using bcrypt.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
