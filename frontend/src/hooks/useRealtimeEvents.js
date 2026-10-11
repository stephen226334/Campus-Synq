import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/**
 * Enhanced Real-Time Academic Events (SSE) hook
 * Features connection monitoring, exponential backoff reconnection,
 * deduplicated notifications, stable callbacks, and stale-data refresh.
 */
export const useRealtimeEvents = (onEventReceived, options = {}) => {
  const { token, isAuthenticated, isFaculty, isDean } = useAuth();
  const { showWarning, showSuccess } = useToast();

  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const hasEverConnectedRef = useRef(false);
  const isDisconnectedRef = useRef(false);
  const isManuallyClosedRef = useRef(false);

  // Store callbacks in refs to prevent unstable dependency re-creation
  const onEventReceivedRef = useRef(onEventReceived);
  const onReconnectRef = useRef(options.onReconnect);

  useEffect(() => {
    onEventReceivedRef.current = onEventReceived;
    onReconnectRef.current = options.onReconnect;
  });

  const maxRetries = options.maxRetries || 8;
  // Determine appropriate SSE endpoint based on role or explicit option
  const endpoint = options.endpoint || (isDean ? '/api/v1/dean/events' : '/api/v1/faculty/events');

  const connect = useCallback(() => {
    if (!isAuthenticated || !token || (!isFaculty && !isDean)) {
      return;
    }

    if (isManuallyClosedRef.current) {
      return;
    }

    // Clean up any existing connection before opening a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const apiOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
    const sseUrl = `${apiOrigin}${endpoint}?token=${encodeURIComponent(token)}`;

    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        retryCountRef.current = 0;

        // Only display "Restored" notification if we transitioned from an actual disconnected state
        if (isDisconnectedRef.current) {
          isDisconnectedRef.current = false;
          showSuccess('Live updates restored.', {
            id: 'sse-connection-restored',
            title: 'Live Connection Restored',
            recommendation: 'Academic schedule is synchronized in real-time.',
            duration: 3500
          });

          // Trigger refresh of stale dashboard/timetable data
          if (onReconnectRef.current) {
            try {
              onReconnectRef.current();
            } catch (err) {
              console.warn('[SSE] Error during onReconnect callback:', err);
            }
          }
        }

        hasEverConnectedRef.current = true;
      };

      es.addEventListener('connected', () => {
        // Handshake confirmed by backend server
      });

      // Timetable & Substitution academic events
      const registerListener = (eventName, callbackType) => {
        es.addEventListener(eventName, (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (onEventReceivedRef.current) {
              onEventReceivedRef.current(callbackType, payload);
            }
          } catch (err) {
            console.error(`[SSE] Failed to parse ${eventName} payload:`, err);
          }
        });
      };

      registerListener('timetable_created', 'TIMETABLE_CREATED');
      registerListener('timetable_updated', 'TIMETABLE_UPDATED');
      registerListener('timetable_deleted', 'TIMETABLE_DELETED');
      registerListener('substitution_updated', 'SUBSTITUTION_UPDATED');

      es.onerror = () => {
        // Close broken connection
        es.close();
        eventSourceRef.current = null;

        if (isManuallyClosedRef.current) {
          return;
        }

        // Only notify on the first failure of an established connection
        if (hasEverConnectedRef.current && !isDisconnectedRef.current) {
          isDisconnectedRef.current = true;
          showWarning('Live updates disconnected. Reconnecting...', {
            id: 'sse-connection-status',
            title: 'Real-Time Disconnected',
            recommendation: 'Reconnection in progress. Schedule changes will sync automatically.',
            duration: 4500
          });
        }

        // Bounded exponential backoff with retry limit
        if (retryCountRef.current < maxRetries) {
          const backoffDelay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 15000);
          retryCountRef.current += 1;

          if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
          }

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, backoffDelay);
        } else {
          console.warn('[SSE] Maximum reconnection attempts reached. Pausing live stream.');
        }
      };
    } catch (err) {
      console.error('[SSE] Failed to initialize EventSource:', err);
    }
  }, [isAuthenticated, token, isFaculty, isDean, endpoint, maxRetries, showWarning, showSuccess]);

  useEffect(() => {
    isManuallyClosedRef.current = false;
    connect();

    return () => {
      isManuallyClosedRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);
};

export default useRealtimeEvents;
