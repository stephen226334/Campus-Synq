import api from './client';

export const deanApi = {
  getDashboard: () => api.get('/dean/dashboard'),
  search: (q, category) => api.get('/dean/search', { q, category }),
  getFacultyList: (params) => api.get('/dean/faculty', params),
  getFacultyDetails: (id) => api.get(`/dean/faculty/${id}`),
  getSubjectList: () => api.get('/dean/subjects'),
  getSubjectDetails: (id) => api.get(`/dean/subjects/${id}`),
  getClassroomList: () => api.get('/dean/classrooms'),
  getClassroomDetails: (id) => api.get(`/dean/classrooms/${id}`),
  getLabList: () => api.get('/dean/labs'),
  getLabDetails: (id) => api.get(`/dean/labs/${id}`),
  getAuditoriumList: () => api.get('/dean/auditoriums'),
  getAuditoriumDetails: (id) => api.get(`/dean/auditoriums/${id}`),
  getSemesterList: () => api.get('/dean/semesters'),
  getSemesterDetails: (id) => api.get(`/dean/semesters/${id}`),
  getSectionList: () => api.get('/dean/sections'),
  getSectionDetails: (id) => api.get(`/dean/sections/${id}`),
  getMasterTimetable: (params) => api.get('/dean/timetable', params),
  getQuickSearch: (q) => api.get('/dean/quick-search', { q }),
  getClassWiseSearch: (params) => api.get('/dean/class-wise', params),
  getRoomWiseSearch: (params) => api.get('/dean/room-wise', params),
  getFacultyWiseSearch: (params) => api.get('/dean/faculty-wise', params),
  getFreeRoomsSearch: (params) => api.get('/dean/free-rooms', params),
  getCurrentStatusSearch: (q) => api.get('/dean/current-status', { q }),
  getSubstitutions: (params) => api.get('/dean/substitutions', params),
  getSubstitutionById: (id) => api.get(`/dean/substitutions/${id}`),
  getAvailableSubstitutes: (params) => api.get('/dean/available-substitutes', params),
  modifySubstitution: (id, data) => api.put(`/dean/substitutions/${id}`, data)
};

export default deanApi;
