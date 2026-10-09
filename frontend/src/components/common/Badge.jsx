import React from 'react';

export const Badge = ({ status, variant, children }) => {
  if (children) {
    return <span className={`badge badge-${variant || 'default'}`}>{children}</span>;
  }

  const s = String(status).toUpperCase();
  if (s === 'ACTIVE') {
    return <span className="badge badge-active">Active</span>;
  }
  if (s === 'INACTIVE') {
    return <span className="badge badge-inactive">Inactive</span>;
  }
  if (s === 'COMING_SOON') {
    return <span className="badge badge-coming-soon">Coming Soon</span>;
  }

  return <span className="badge">{status}</span>;
};

export default Badge;
