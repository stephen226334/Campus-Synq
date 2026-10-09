import React from 'react';
import Modal from './Modal';
import { AlertTriangle, Loader2 } from 'lucide-react';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Deletion',
  message = 'Are you sure you want to delete this record? This action cannot be undone.',
  itemName,
  isDeleting = false,
  error = null
}) => {
  return (
    <Modal isOpen={isOpen} onClose={isDeleting ? () => {} : onClose} title={title} maxWidth="480px">
      <div className="confirm-dialog-content">
        <div className="confirm-dialog-icon">
          <AlertTriangle size={32} />
        </div>
        <div className="confirm-dialog-body">
          <p className="confirm-dialog-text">{message}</p>
          {itemName && (
            <p className="confirm-dialog-item-highlight">
              Target: <strong>{itemName}</strong>
            </p>
          )}

          {error && (
            <div className="confirm-dialog-error" role="alert">
              <p className="error-title">Deletion Blocked</p>
              <p className="error-message">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onClose}
          disabled={isDeleting}
          id="btn-confirm-cancel"
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={onConfirm}
          disabled={isDeleting}
          id="btn-confirm-delete"
        >
          {isDeleting ? (
            <>
              <Loader2 className="spinner" size={16} />
              Deleting...
            </>
          ) : (
            'Delete Record'
          )}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
