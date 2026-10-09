import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../common/LoadingSkeleton';

export const ProtectedRoute = ({ children, allowedRoles = ['ADMIN'] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <LoadingSkeleton message="Authenticating session..." rows={4} cols={4} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user?.role || 'STUDENT';
  if (!allowedRoles.includes(userRole)) {
    let targetDashboard = '/login';
    let targetLabel = 'Return to Login';

    if (userRole === 'DEAN') {
      targetDashboard = '/dean/dashboard';
      targetLabel = 'Go to Dean Dashboard';
    } else if (userRole === 'FACULTY' || userRole === 'HOD_FACULTY') {
      targetDashboard = '/faculty/dashboard';
      targetLabel = 'Go to Faculty Dashboard';
    } else if (userRole === 'ADMIN') {
      targetDashboard = '/admin/dashboard';
      targetLabel = 'Go to Admin Dashboard';
    }

    return (
      <div className="access-denied-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEE2E2', color: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', fontSize: '24px', fontWeight: 'bold' }}>
            ✕
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
            You do not have the required permissions to access this portal. Your current role is <strong>{userRole}</strong>.
          </p>
          <a href={targetDashboard} className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.75rem 1.5rem', width: '100%', justifyContent: 'center' }}>
            {targetLabel}
          </a>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
