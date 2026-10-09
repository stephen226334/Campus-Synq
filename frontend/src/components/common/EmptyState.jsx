import React from 'react';
import { PlusCircle, Inbox } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No records found',
  description = 'Get started by creating your first entry.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="empty-state-container">
      <div className="empty-state-icon">
        <Icon size={44} strokeWidth={1.5} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-description">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={onAction}
          id="btn-empty-state-action"
        >
          <PlusCircle size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
