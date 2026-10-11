/**
 * Centralized API & Network Error Normalizer for CampusSynq
 * Transforms raw fetch/HTTP/network errors into structured, user-actionable notifications.
 */

export const normalizeApiError = (err, fallbackContext = {}) => {
  if (!err) {
    return {
      title: fallbackContext.defaultTitle || 'Unknown Error',
      message: 'An unexpected problem occurred.',
      recommendation: 'Please retry your action.',
      type: 'error',
      status: null,
      code: 'UNKNOWN_ERROR',
      dataSaved: false,
      isNetworkError: false,
      isAuthError: false,
      isConflict: false
    };
  }

  const status = err.status || (err.response && err.response.status) || null;
  const serverData = err.data || (err.response && err.response.data) || null;
  const rawMessage = (serverData && serverData.message) || err.message || '';
  const serverCode = (serverData && serverData.code) || err.code || null;
  const serverRecommendation = (serverData && serverData.recommendation) || null;

  // 1. Detect Offline State
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      title: 'Network Connection Problem',
      message: 'Your request could not reach the server. Your computer appears to be offline.',
      recommendation: 'Check your internet connection and retry.',
      type: 'error',
      status: null,
      code: 'OFFLINE',
      dataSaved: false,
      isNetworkError: true,
      isAuthError: false,
      isConflict: false
    };
  }

  // 2. Detect Request Timeout or Aborted Operation
  if (
    err.name === 'TimeoutError' ||
    err.name === 'AbortError' ||
    rawMessage.toLowerCase().includes('timeout') ||
    rawMessage.toLowerCase().includes('aborted') ||
    err.code === 'TIMEOUT'
  ) {
    return {
      title: 'Request Timed Out',
      message: "The server took too long to respond. Your data has not been confirmed as saved.",
      recommendation: 'Please check the current record or refresh the page before retrying.',
      type: 'warning',
      status: 408,
      code: 'REQUEST_TIMEOUT',
      dataSaved: 'UNCERTAIN',
      isNetworkError: true,
      isAuthError: false,
      isConflict: false
    };
  }

  // 3. Detect Server Unreachable / Connection Refused (Network failure)
  if (
    err.name === 'TypeError' &&
    (rawMessage.includes('fetch') || rawMessage.includes('NetworkError') || rawMessage.includes('Failed to fetch'))
  ) {
    return {
      title: 'Unable to Connect',
      message: 'CampusSynq could not reach the server. The operation was not confirmed.',
      recommendation: 'Please check whether the backend server is running and try again.',
      type: 'error',
      status: null,
      code: 'BACKEND_UNAVAILABLE',
      dataSaved: false,
      isNetworkError: true,
      isAuthError: false,
      isConflict: false
    };
  }

  // 4. Handle HTTP Status Codes
  switch (status) {
    case 400: {
      const isReferentialBlock =
        serverCode === 'REFERENTIAL_INTEGRITY_VIOLATION' ||
        rawMessage.toLowerCase().includes('referenced by') ||
        rawMessage.toLowerCase().includes('dependency');

      if (isReferentialBlock) {
        return {
          title: 'Cannot Delete Record',
          message: rawMessage || 'This record is referenced by existing academic data.',
          recommendation: serverRecommendation || 'Review and reassign dependent subjects, sections, or faculty before deleting this record.',
          type: 'error',
          status: 400,
          code: 'REFERENTIAL_INTEGRITY_VIOLATION',
          dataSaved: false,
          isNetworkError: false,
          isAuthError: false,
          isConflict: false
        };
      }

      return {
        title: fallbackContext.action ? `Cannot ${fallbackContext.action}` : 'Check Required Fields',
        message: rawMessage || 'Some information is missing or invalid.',
        recommendation: serverRecommendation || 'Review the highlighted fields and correct the inputs before trying again.',
        type: 'error',
        status: 400,
        code: serverCode || 'VALIDATION_FAILED',
        dataSaved: false,
        errors: serverData?.errors || null,
        isNetworkError: false,
        isAuthError: false,
        isConflict: false
      };
    }

    case 401: {
      return {
        title: 'Session Expired',
        message: rawMessage || 'Your session has expired or your credentials are invalid.',
        recommendation: 'Please sign in again to continue.',
        type: 'warning',
        status: 401,
        code: 'UNAUTHORIZED',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: true,
        isConflict: false
      };
    }

    case 403: {
      return {
        title: 'Access Denied',
        message: rawMessage || 'You do not have permission to perform this administrative operation.',
        recommendation: 'Verify that your current role grants access, or contact your department administrator.',
        type: 'error',
        status: 403,
        code: 'FORBIDDEN',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: true,
        isConflict: false
      };
    }

    case 404: {
      return {
        title: 'Record Not Found',
        message: rawMessage || 'The requested academic record could not be found.',
        recommendation: 'The item may have already been deleted or moved. Refresh the page to check current records.',
        type: 'warning',
        status: 404,
        code: 'NOT_FOUND',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: false,
        isConflict: false
      };
    }

    case 409: {
      const isTimetableConflict =
        serverCode === 'TIMETABLE_CONFLICT' ||
        rawMessage.toLowerCase().includes('conflict') ||
        rawMessage.toLowerCase().includes('assigned') ||
        rawMessage.toLowerCase().includes('allocated') ||
        rawMessage.toLowerCase().includes('occupied');

      if (isTimetableConflict) {
        return {
          title: 'Scheduling Conflict Detected',
          message: rawMessage || 'This timetable slot conflicts with an existing faculty, classroom, or section assignment.',
          recommendation: serverRecommendation || 'Choose a different faculty member, room, or period slot to resolve the conflict.',
          type: 'error',
          status: 409,
          code: 'TIMETABLE_CONFLICT',
          dataSaved: false,
          isNetworkError: false,
          isAuthError: false,
          isConflict: true
        };
      }

      return {
        title: 'Record Already Exists',
        message: rawMessage || 'A record with these details already exists in the system.',
        recommendation: serverRecommendation || 'Check existing records before creating another with the same identifier.',
        type: 'error',
        status: 409,
        code: 'DUPLICATE_RESOURCE',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: false,
        isConflict: true
      };
    }

    case 422: {
      return {
        title: 'Unprocessable Information',
        message: rawMessage || 'The server could not process the provided data.',
        recommendation: 'Review your inputs and try again.',
        type: 'error',
        status: 422,
        code: 'UNPROCESSABLE_ENTITY',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: false,
        isConflict: false
      };
    }

    case 429: {
      return {
        title: 'Too Many Requests',
        message: rawMessage || 'Too many attempts were made in a short time.',
        recommendation: 'Please wait a minute before attempting your request again.',
        type: 'warning',
        status: 429,
        code: 'RATE_LIMITED',
        dataSaved: false,
        isNetworkError: false,
        isAuthError: false,
        isConflict: false
      };
    }

    case 502:
    case 503:
    case 504: {
      return {
        title: 'Service Temporarily Unavailable',
        message: rawMessage || 'The database or backend service is temporarily offline or unreachable.',
        recommendation: serverRecommendation || 'Please wait a few moments and try your request again.',
        type: 'error',
        status,
        code: serverCode || 'SERVICE_UNAVAILABLE',
        dataSaved: false,
        isNetworkError: true,
        isAuthError: false,
        isConflict: false
      };
    }

    case 500:
    default: {
      return {
        title: 'Something Went Wrong',
        message: rawMessage || "We couldn't complete your request. Your data has not been confirmed as saved.",
        recommendation: serverRecommendation || 'Please check the current record before retrying to prevent duplicates.',
        type: 'error',
        status: status || 500,
        code: serverCode || 'INTERNAL_SERVER_ERROR',
        dataSaved: 'UNCERTAIN',
        isNetworkError: false,
        isAuthError: false,
        isConflict: false
      };
    }
  }
};

export default normalizeApiError;
