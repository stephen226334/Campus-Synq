import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StatCard = ({ title, count = 0, icon: Icon, linkTo, color = 'purple' }) => {
  return (
    <div className={`stat-card card stat-card-${color}`}>
      <div className="stat-card-header">
        <div className="stat-icon-wrapper">
          <Icon size={22} />
        </div>
        {linkTo && (
          <Link to={linkTo} className="stat-card-link" title={`View ${title}`}>
            <ArrowUpRight size={18} />
          </Link>
        )}
      </div>
      <div className="stat-card-body">
        <span className="stat-card-label">{title}</span>
        <div className="stat-card-count">{count}</div>
      </div>
    </div>
  );
};

export default StatCard;
