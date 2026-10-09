import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="not-found-page">
      <div className="not-found-card card">
        <div className="not-found-icon">
          <AlertCircle size={48} />
        </div>
        <h1>404 — Page Not Found</h1>
        <p>The academic resource or administrative view you requested does not exist.</p>
        <Link to="/admin/dashboard" className="btn btn-primary" id="btn-return-dashboard">
          <ArrowLeft size={16} />
          Return to Admin Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
