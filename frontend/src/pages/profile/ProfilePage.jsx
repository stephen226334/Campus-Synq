import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Shield, Mail, Building, Calendar, CheckCircle2, User, KeyRound } from 'lucide-react';
import Badge from '../../components/common/Badge';

export const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="profile-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Administrator Profile</h1>
          <p className="page-subtitle">
            Authenticated administrator credentials and departmental governance scope.
          </p>
        </div>
      </div>

      <div className="profile-grid">
        {/* Profile Card */}
        <div className="card profile-info-card">
          <div className="profile-header-strip">
            <div className="profile-avatar-large">
              <User size={40} />
            </div>
            <div className="profile-title-block">
              <h2>{user?.fullName || 'Root Administrator'}</h2>
              <div className="profile-tags">
                <span className="badge badge-active">
                  <Shield size={12} />
                  Role: {user?.role || 'ADMIN'}
                </span>
                <span className="badge badge-active">Active</span>
              </div>
            </div>
          </div>

          <div className="profile-details-list">
            <div className="profile-detail-row">
              <div className="detail-label">
                <Mail size={16} />
                <span>Email Address</span>
              </div>
              <div className="detail-value font-mono">{user?.email}</div>
            </div>

            <div className="profile-detail-row">
              <div className="detail-label">
                <Building size={16} />
                <span>Department</span>
              </div>
              <div className="detail-value">{user?.department || 'Computer Science'}</div>
            </div>

            <div className="profile-detail-row">
              <div className="detail-label">
                <Shield size={16} />
                <span>Authority Level</span>
              </div>
              <div className="detail-value font-semibold text-primary">
                Full Academic Administration (Tier 1)
              </div>
            </div>

            <div className="profile-detail-row">
              <div className="detail-label">
                <Calendar size={16} />
                <span>Account Created</span>
              </div>
              <div className="detail-value text-muted">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'System Genesis'}
              </div>
            </div>

            {user?.lastLogin && (
              <div className="profile-detail-row">
                <div className="detail-label">
                  <CheckCircle2 size={16} />
                  <span>Last Authenticated Session</span>
                </div>
                <div className="detail-value text-muted">
                  {new Date(user.lastLogin).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Overview */}
        <div className="card profile-security-card">
          <div className="card-header">
            <h3>Security & RBAC Architecture</h3>
          </div>
          <div className="card-body">
            <div className="security-check-item">
              <div className="check-icon success">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <strong>Cryptographic Salt Hashing</strong>
                <p>Passphrase stored as bcrypt one-way hash (10 salt rounds). Plaintext never stored or emitted.</p>
              </div>
            </div>

            <div className="security-check-item">
              <div className="check-icon success">
                <KeyRound size={18} />
              </div>
              <div>
                <strong>Stateless JWT Authentication</strong>
                <p>Tokens signed with HMAC SHA-256 and verified via Express authMiddleware on every protected route.</p>
              </div>
            </div>

            <div className="security-check-item">
              <div className="check-icon success">
                <Shield size={18} />
              </div>
              <div>
                <strong>Initial Setup Lock Active</strong>
                <p>Unrestricted public signups are disabled. Only authenticated administrators may manage academic master records.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
