import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSkeleton = ({ message = 'Loading...', rows = 5, cols = 4, type = 'table' }) => {
  if (type === 'cards') {
    return (
      <div className="skeleton-grid">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="skeleton-card animate-pulse">
            <div className="skeleton-line line-sm" style={{ width: '40%' }}></div>
            <div className="skeleton-line line-lg" style={{ width: '60%', height: '32px' }}></div>
            <div className="skeleton-line line-xs" style={{ width: '80%' }}></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="skeleton-table-wrapper">
      <div className="loading-banner">
        <Loader2 className="spinner" size={20} />
        <span>{message}</span>
      </div>
      <table className="data-table skeleton-table">
        <tbody>
          {[...Array(rows)].map((_, rIdx) => (
            <tr key={rIdx} className="animate-pulse">
              {[...Array(cols)].map((_, cIdx) => (
                <td key={cIdx}>
                  <div className="skeleton-line" style={{ width: `${Math.floor(50 + (cIdx * 15) % 45)}%` }}></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoadingSkeleton;
