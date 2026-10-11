import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

const ToastContext = createContext();

const DEFAULT_DURATIONS = {
  success: 4000,
  info: 5000,
  warning: 6500,
  error: 8500,
  loading: 0 // Remains until manually dismissed or replaced
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
    recentToastsRef.current.clear();
  }, []);

  /**
   * Primary notification dispatcher
   * Supports both legacy string signature and modern structured notification objects.
   */
  const showToast = useCallback(
    (messageOrOptions, legacyType = 'success', legacyDuration = null) => {
      let toastConfig = {};

      if (typeof messageOrOptions === 'string') {
        toastConfig = {
          message: messageOrOptions,
          type: legacyType,
          duration: legacyDuration !== null ? legacyDuration : DEFAULT_DURATIONS[legacyType] || 4000
        };
      } else if (messageOrOptions instanceof Error) {
        toastConfig = {
          title: messageOrOptions.title || (legacyType === 'error' ? 'Operation Failed' : ''),
          message: messageOrOptions.message || 'An error occurred.',
          recommendation: messageOrOptions.recommendation || '',
          dataSaved: messageOrOptions.dataSaved,
          type: messageOrOptions.type || legacyType || 'error',
          duration: legacyDuration !== null ? legacyDuration : DEFAULT_DURATIONS[legacyType || 'error'] || 8500
        };
      } else if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
        toastConfig = { ...messageOrOptions };
        toastConfig.type = toastConfig.type || legacyType || 'info';
        if (toastConfig.duration === undefined || toastConfig.duration === null) {
          toastConfig.duration = DEFAULT_DURATIONS[toastConfig.type] || 5000;
        }
      }

      const {
        title = '',
        message = '',
        recommendation = '',
        type = 'info',
        duration = 5000,
        dataSaved = undefined,
        id: customId
      } = toastConfig;

      // De-duplication check: Prevent identical notifications within a 3-second window
      const dedupKey = `${type}:${title}:${message}`;
      const now = Date.now();
      const lastSeen = recentToastsRef.current.get(dedupKey);

      if (lastSeen && now - lastSeen < 3000 && !customId) {
        return lastSeen.id;
      }

      const id = customId || 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
      recentToastsRef.current.set(dedupKey, { timestamp: now, id });

      // Clean up old entries from deduplication map
      if (recentToastsRef.current.size > 20) {
        for (const [k, v] of recentToastsRef.current.entries()) {
          if (now - v.timestamp > 10000) {
            recentToastsRef.current.delete(k);
          }
        }
      }

      setToasts((prev) => {
        // If updating an existing toast by id (e.g. converting loading to success)
        const exists = prev.some((t) => t.id === id);
        if (exists) {
          return prev.map((t) =>
            t.id === id ? { id, title, message, recommendation, type, dataSaved } : t
          );
        }
        return [...prev, { id, title, message, recommendation, type, dataSaved }];
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }

      return id;
    },
    [removeToast]
  );

  /**
   * Helper: Show structured error notification from an Error object or message
   */
  const showError = useCallback(
    (errOrTitle, options = {}) => {
      let config = {};
      if (errOrTitle instanceof Error || (typeof errOrTitle === 'object' && errOrTitle?.message)) {
        config = {
          title: errOrTitle.title || options.title || 'Operation Failed',
          message: errOrTitle.message || 'An unexpected problem occurred.',
          recommendation: errOrTitle.recommendation || options.recommendation || '',
          dataSaved: errOrTitle.dataSaved !== undefined ? errOrTitle.dataSaved : options.dataSaved,
          type: 'error',
          duration: options.duration || DEFAULT_DURATIONS.error,
          ...options
        };
      } else {
        config = {
          title: typeof errOrTitle === 'string' && options.message ? errOrTitle : options.title || 'Error',
          message: options.message || (typeof errOrTitle === 'string' ? errOrTitle : 'Action failed.'),
          recommendation: options.recommendation || '',
          dataSaved: options.dataSaved,
          type: 'error',
          duration: options.duration || DEFAULT_DURATIONS.error,
          ...options
        };
      }
      return showToast(config);
    },
    [showToast]
  );

  /**
   * Helper: Show structured success notification
   */
  const showSuccess = useCallback(
    (titleOrMsg, options = {}) => {
      const config = {
        title: options.message ? titleOrMsg : options.title || 'Success',
        message: options.message || titleOrMsg,
        recommendation: options.recommendation || '',
        dataSaved: true,
        type: 'success',
        duration: options.duration || DEFAULT_DURATIONS.success,
        ...options
      };
      return showToast(config);
    },
    [showToast]
  );

  /**
   * Helper: Show structured warning notification
   */
  const showWarning = useCallback(
    (titleOrMsg, options = {}) => {
      const config = {
        title: options.message ? titleOrMsg : options.title || 'Warning',
        message: options.message || titleOrMsg,
        recommendation: options.recommendation || '',
        type: 'warning',
        duration: options.duration || DEFAULT_DURATIONS.warning,
        ...options
      };
      return showToast(config);
    },
    [showToast]
  );

  /**
   * Helper: Show structured informational notification
   */
  const showInfo = useCallback(
    (titleOrMsg, options = {}) => {
      const config = {
        title: options.message ? titleOrMsg : options.title || 'Information',
        message: options.message || titleOrMsg,
        recommendation: options.recommendation || '',
        type: 'info',
        duration: options.duration || DEFAULT_DURATIONS.info,
        ...options
      };
      return showToast(config);
    },
    [showToast]
  );

  /**
   * Helper: Show loading notification (sticky until resolved)
   */
  const showLoading = useCallback(
    (titleOrMsg, options = {}) => {
      const config = {
        title: options.message ? titleOrMsg : options.title || 'Please Wait',
        message: options.message || titleOrMsg || 'Operation in progress...',
        type: 'loading',
        duration: 0,
        ...options
      };
      return showToast(config);
    },
    [showToast]
  );

  const contextValue = {
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showLoading,
    removeToast,
    clearAll
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.type} animate-slide-in`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            <div className="toast-icon">
              {toast.type === 'success' && <CheckCircle2 size={20} />}
              {toast.type === 'error' && <AlertCircle size={20} />}
              {toast.type === 'warning' && <AlertTriangle size={20} />}
              {toast.type === 'info' && <Info size={20} />}
              {toast.type === 'loading' && <Loader2 size={20} className="spinner" />}
            </div>

            <div className="toast-content-wrapper">
              {toast.title && <div className="toast-title">{toast.title}</div>}
              {toast.message && <div className="toast-message">{toast.message}</div>}

              {toast.recommendation && (
                <div className="toast-recommendation">
                  <span className="toast-recommendation-label">Action:</span> {toast.recommendation}
                </div>
              )}

              {toast.dataSaved !== undefined && (
                <div className="toast-data-status">
                  {toast.dataSaved === false && (
                    <span className="badge-data-unsaved">Data not saved</span>
                  )}
                  {toast.dataSaved === 'UNCERTAIN' && (
                    <span className="badge-data-uncertain">Outcome unconfirmed</span>
                  )}
                </div>
              )}
            </div>

            <button
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default useToast;
