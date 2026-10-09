import React from 'react';

export const StatCard = ({ icon: Icon, colorTheme, label, value, subtext }) => {
  const iconThemeClass = `fp-stat-icon-${colorTheme || 'purple'}`;

  return (
    <div className="fp-stat-card">
      <div className="fp-stat-top">
        <div className={`fp-stat-icon-wrap ${iconThemeClass}`}>
          {Icon && <Icon size={20} />}
        </div>
      </div>

      <div>
        <div className="fp-stat-label">{label}</div>
        <div className="fp-stat-value">{value ?? 0}</div>
        <div className="fp-stat-subtext">{subtext}</div>
      </div>
    </div>
  );
};

export default StatCard;
