import api from './client';

export const facultyApi = {
  getDashboard: () => api.get('/faculty/dashboard'),
  getTodayTimetable: () => api.get('/faculty/timetable/today'),
  getWeeklyTimetable: () => api.get('/faculty/timetable/weekly'),
  getAvailableSubstitutes: (day, periodId) =>
    api.get(`/faculty/available-substitutes?day=${encodeURIComponent(day)}&periodId=${encodeURIComponent(periodId)}`),
  requestSubstitution: (payload) => api.post('/faculty/substitution', payload),
  getSubstitutions: () => api.get('/faculty/substitutions'),
  getProfile: () => api.get('/auth/me')
};

export default facultyApi;
