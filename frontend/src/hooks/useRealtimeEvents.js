import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const useRealtimeEvents = (onEventReceived) => {
  const { token, isAuthenticated, isFaculty } = useAuth();
  const { showToast } = useToast();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !token || !isFaculty) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const apiOrigin = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
    const sseUrl = `${apiOrigin}/api/v1/faculty/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      // Connected to real-time academic event stream
    });

    es.addEventListener('substitution_updated', (event) => {
      try {
        const payload = JSON.parse(event.data);
        showToast('Real-Time Update: Timetable substitution updated.', 'info');
        if (onEventReceived) onEventReceived('SUBSTITUTION_UPDATED', payload);
      } catch (err) {
        console.error('Failed to parse SSE substitution event:', err);
      }
    });

    es.addEventListener('timetable_updated', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (onEventReceived) onEventReceived('TIMETABLE_UPDATED', payload);
      } catch (err) {
        console.error('Failed to parse SSE timetable event:', err);
      }
    });

    es.addEventListener('timetable_created', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (onEventReceived) onEventReceived('TIMETABLE_CREATED', payload);
      } catch (err) {
        console.error('Failed to parse SSE timetable event:', err);
      }
    });

    es.onerror = () => {
      // Reconnection handled automatically by browser EventSource
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [token, isAuthenticated, isFaculty, onEventReceived, showToast]);
};

export default useRealtimeEvents;
