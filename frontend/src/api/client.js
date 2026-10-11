/**
 * Campus Synq API Client
 * Centralized request layer with timeout handling, correlation IDs, and normalized errors.
 */

import { normalizeApiError } from './errorHandler';

const API_ORIGIN = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '';
const BASE_URL = `${API_ORIGIN}/api/v1`;
const DEFAULT_TIMEOUT_MS = 15000;

class ApiClient {
  getToken() {
    return localStorage.getItem('campus_synq_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('campus_synq_token', token);
    } else {
      localStorage.removeItem('campus_synq_token');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = this.getToken();
    const timeoutMs = options.timeout || DEFAULT_TIMEOUT_MS;

    // Create AbortController for request timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // Generate lightweight correlation ID
    const correlationId = 'req-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);

    const headers = {
      'Content-Type': 'application/json',
      'X-Request-Id': correlationId,
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
      ...options,
      headers,
      signal: options.signal || controller.signal
    };

    try {
      const response = await fetch(url, config);
      clearTimeout(timeoutId);

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const isAuthEndpoint = endpoint.startsWith('/auth/login') || endpoint.startsWith('/auth/signup');

        if (response.status === 401 && !isAuthEndpoint) {
          // If session expired during an authenticated request, clear token and notify
          this.setToken(null);
          window.dispatchEvent(new Event('campus_synq_unauthorized'));
        }

        const rawErrorMessage = (data && data.message) || `Request failed with status ${response.status}`;
        const rawError = new Error(rawErrorMessage);
        rawError.status = response.status;
        rawError.data = data;
        rawError.errors = data ? data.errors : null;
        rawError.code = data ? data.code : null;

        // Normalize error with structured metadata
        const normalized = normalizeApiError(rawError);
        const enrichedError = new Error(normalized.message);
        Object.assign(enrichedError, normalized, {
          status: response.status,
          data,
          errors: data?.errors || null,
          correlationId
        });

        throw enrichedError;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);

      // If already normalized, rethrow directly
      if (err.title && err.code && err.dataSaved !== undefined) {
        throw err;
      }

      // Check if timeout caused abort
      if (err.name === 'AbortError') {
        const timeoutError = new Error('Request timed out after ' + Math.round(timeoutMs / 1000) + ' seconds.');
        timeoutError.name = 'TimeoutError';
        timeoutError.code = 'TIMEOUT';
        const normalized = normalizeApiError(timeoutError);
        Object.assign(timeoutError, normalized, { correlationId });
        throw timeoutError;
      }

      // Normalize network / fetch failure
      const normalized = normalizeApiError(err);
      const enrichedError = new Error(normalized.message);
      Object.assign(enrichedError, normalized, {
        originalError: err,
        correlationId
      });
      throw enrichedError;
    }
  }

  get(endpoint, params, options = {}) {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.append(key, value);
        }
      });
      const queryString = query.toString();
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString;
      }
    }
    return this.request(url, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body)
    });
  }

  delete(endpoint, bodyOrOptions = {}, maybeOptions = {}) {
    if (bodyOrOptions && (bodyOrOptions.headers || bodyOrOptions.signal || bodyOrOptions.timeout || bodyOrOptions.body)) {
      return this.request(endpoint, { ...bodyOrOptions, method: 'DELETE' });
    }
    if (bodyOrOptions && typeof bodyOrOptions === 'object' && Object.keys(bodyOrOptions).length > 0) {
      return this.request(endpoint, {
        ...maybeOptions,
        method: 'DELETE',
        body: JSON.stringify(bodyOrOptions)
      });
    }
    return this.request(endpoint, { ...maybeOptions, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
