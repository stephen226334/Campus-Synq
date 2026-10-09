import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import { useToast } from '../../context/ToastContext';
import {
  CalendarDays,
  Plus,
  Clock,
  User,
  BookOpen,
  DoorOpen,
  Layers,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2,
  Filter
} from 'lucide-react';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const TimetablePage = () => {
  const [entries, setEntries] = useState([]);
  const [periodsList, setPeriodsList] = useState([]);
  const [semestersList, setSemestersList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [classroomsList, setClassroomsList] = useState([]);
  const [labsList, setLabsList] = useState([]);
  const [auditoriumsList, setAuditoriumsList] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Filters
  const [semesterFilter, setSemesterFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('');

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    day: 'Monday',
    period: '',
    semester: '',
    section: '',
    subject: '',
    faculty: '',
    roomType: 'Classroom',
    roomId: '',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  const loadAllMasterData = async () => {
    try {
      const [pers, sems, secs, subs, facs, rooms, labs, auds] = await Promise.all([
        api.get('/admin/periods'),
        api.get('/admin/semesters'),
        api.get('/admin/class-sections'),
        api.get('/admin/subjects'),
        api.get('/admin/faculty'),
        api.get('/admin/classrooms'),
        api.get('/admin/labs'),
        api.get('/admin/auditoriums')
      ]);

      if (pers?.data) setPeriodsList(pers.data);
      if (sems?.data) setSemestersList(sems.data);
      if (secs?.data) setSectionsList(secs.data);
      if (subs?.data) setSubjectsList(subs.data);
      if (facs?.data) setFacultyList(facs.data);
      if (rooms?.data) setClassroomsList(rooms.data);
      if (labs?.data) setLabsList(labs.data);
      if (auds?.data) setAuditoriumsList(auds.data);
    } catch (err) {
      console.error('Failed to load master data for timetable:', err);
    }
  };

  const fetchTimetable = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (selectedDay && selectedDay !== 'ALL') params.day = selectedDay;
      if (semesterFilter) params.semester = semesterFilter;
      if (sectionFilter) params.section = sectionFilter;
      if (facultyFilter) params.faculty = facultyFilter;

      const res = await api.get('/admin/timetable', params);
      if (res && res.data) {
        setEntries(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load timetable', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay, semesterFilter, sectionFilter, facultyFilter, showToast]);

  useEffect(() => {
    loadAllMasterData();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      day: selectedDay !== 'ALL' ? selectedDay : 'Monday',
      period: periodsList[0]?._id || '',
      semester: semestersList[0]?._id || '',
      section: sectionsList[0]?._id || '',
      subject: subjectsList[0]?._id || '',
      faculty: facultyList[0]?._id || '',
      roomType: 'Classroom',
      roomId: classroomsList[0]?._id || '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingItem(entry);
    setFormData({
      day: entry.day,
      period: entry.period?._id || entry.period,
      semester: entry.semester?._id || entry.semester,
      section: entry.section?._id || entry.section,
      subject: entry.subject?._id || entry.subject,
      faculty: entry.faculty?._id || entry.faculty,
      roomType: entry.roomType || 'Classroom',
      roomId: entry.roomId,
      status: entry.status || 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.day) errs.day = 'Day is required';
    if (!formData.period) errs.period = 'Period slot is required';
    if (!formData.semester) errs.semester = 'Semester is required';
    if (!formData.section) errs.section = 'Class section is required';
    if (!formData.subject) errs.subject = 'Subject is required';
    if (!formData.faculty) errs.faculty = 'Faculty member is required';
    if (!formData.roomType) errs.roomType = 'Room type is required';
    if (!formData.roomId) errs.roomId = 'Room selection is required';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setFormErrors({});
    try {
      if (editingItem) {
        await api.put(`/admin/timetable/${editingItem._id}`, formData);
        showToast('Timetable session updated successfully', 'success');
      } else {
        await api.post('/admin/timetable', formData);
        showToast('Timetable session scheduled successfully', 'success');
      }
      setIsModalOpen(false);
      fetchTimetable();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to schedule timetable session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (entry) => {
    setDeletingItem(entry);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/timetable/${deletingItem._id}`);
      showToast('Timetable session deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchTimetable();
    } catch (err) {
      showToast(err.message || 'Failed to delete timetable entry', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper for available rooms based on selected roomType
  const getRoomOptions = () => {
    if (formData.roomType === 'Classroom') {
      return classroomsList.map((r) => ({
        id: r._id,
        label: `Classroom ${r.roomNumber} (${r.capacity} seats)`
      }));
    }
    if (formData.roomType === 'Lab') {
      return labsList.map((l) => ({
        id: l._id,
        label: `${l.labName} [${l.labNumber}] (${l.capacity} stations)`
      }));
    }
    if (formData.roomType === 'Auditorium') {
      return auditoriumsList.map((a) => ({
        id: a._id,
        label: `${a.auditoriumName} [${a.auditoriumNumber}] (${a.capacity} seats)`
      }));
    }
    return [];
  };

  return (
    <div className="master-data-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Timetable Management</h1>
          <p className="page-subtitle">
            Orchestrate weekly department schedules, lecture timings, faculty assignments, and venue allocation.
          </p>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenAdd}
            id="btn-add-timetable-entry"
          >
            <Plus size={16} />
            <span>Schedule Class</span>
          </button>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="card" style={{ padding: '0.65rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              className={`btn btn-sm ${selectedDay === day ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </button>
          ))}
          <button
            type="button"
            className={`btn btn-sm ${selectedDay === 'ALL' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setSelectedDay('ALL')}
          >
            All Days
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-select table-filter-select"
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
            aria-label="Filter by Semester"
          >
            <option value="">All Semesters</option>
            {semestersList.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          <select
            className="form-select table-filter-select"
            value={facultyFilter}
            onChange={(e) => setFacultyFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
            aria-label="Filter by Faculty"
          >
            <option value="">All Faculty</option>
            {facultyList.map((f) => (
              <option key={f._id} value={f._id}>{f.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Schedule Display */}
      {isLoading ? (
        <LoadingSkeleton message="Loading timetable schedule..." rows={6} cols={5} />
      ) : entries.length === 0 ? (
        <div className="card">
          <EmptyState
            title={`No classes scheduled for ${selectedDay === 'ALL' ? 'the week' : selectedDay}`}
            description="Use the button above to schedule lectures, laboratories, or seminar sessions."
            actionLabel="Schedule First Class"
            onAction={handleOpenAdd}
          />
        </div>
      ) : (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div className="table-responsive-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '110px' }}>Day</th>
                  <th style={{ width: '160px' }}>Period Slot</th>
                  <th>Subject</th>
                  <th>Class / Section</th>
                  <th>Instructor</th>
                  <th>Room Venue</th>
                  <th style={{ textAlign: 'right', width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry._id}>
                    <td>
                      <span className="font-semibold text-primary">{entry.day}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="code-badge font-mono" style={{ alignSelf: 'flex-start' }}>
                          {entry.period?.periodNumber || 'Period'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {entry.period?.startTime} - {entry.period?.endTime}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="font-semibold">{entry.subject?.name}</span>
                        <span className="text-muted text-sm">{entry.subject?.code}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-active" style={{ textTransform: 'none' }}>
                        <Layers size={11} /> {entry.semester?.name} • {entry.section?.name}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <User size={14} style={{ color: 'var(--text-muted)' }} />
                        <span className="font-medium">{entry.faculty?.fullName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="font-semibold" style={{ color: 'var(--primary-main)' }}>
                          {entry.roomDetails?.roomNumber}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {entry.roomType}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-action-buttons">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleOpenEdit(entry)}
                          title="Edit Session"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm text-danger"
                          onClick={() => handleOpenDelete(entry)}
                          title="Delete Session"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TIMETABLE ENTRY MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Timetable Session' : 'Schedule Timetable Session'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{formErrors.submit}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tt-day" className="form-label">
                Day of Week <span className="required">*</span>
              </label>
              <select
                id="tt-day"
                className="form-select"
                value={formData.day}
                onChange={(e) => setFormData({ ...formData, day: e.target.value })}
              >
                {DAYS_OF_WEEK.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tt-period" className="form-label">
                Period Interval <span className="required">*</span>
              </label>
              <select
                id="tt-period"
                className={`form-select ${formErrors.period ? 'error' : ''}`}
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                required
              >
                <option value="">Select Period Slot</option>
                {periodsList.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.periodNumber} ({p.startTime} - {p.endTime})
                  </option>
                ))}
              </select>
              {formErrors.period && <span className="form-error-msg">{formErrors.period}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tt-semester" className="form-label">
                Academic Semester <span className="required">*</span>
              </label>
              <select
                id="tt-semester"
                className={`form-select ${formErrors.semester ? 'error' : ''}`}
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                required
              >
                <option value="">Select Semester</option>
                {semestersList.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.academicYear})</option>
                ))}
              </select>
              {formErrors.semester && <span className="form-error-msg">{formErrors.semester}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tt-section" className="form-label">
                Class Section <span className="required">*</span>
              </label>
              <select
                id="tt-section"
                className={`form-select ${formErrors.section ? 'error' : ''}`}
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              >
                <option value="">Select Section</option>
                {sectionsList.map((sec) => (
                  <option key={sec._id} value={sec._id}>{sec.name}</option>
                ))}
              </select>
              {formErrors.section && <span className="form-error-msg">{formErrors.section}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tt-subject" className="form-label">
                Subject Course <span className="required">*</span>
              </label>
              <select
                id="tt-subject"
                className={`form-select ${formErrors.subject ? 'error' : ''}`}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              >
                <option value="">Select Subject</option>
                {subjectsList.map((sub) => (
                  <option key={sub._id} value={sub._id}>{sub.code}: {sub.name}</option>
                ))}
              </select>
              {formErrors.subject && <span className="form-error-msg">{formErrors.subject}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="tt-faculty" className="form-label">
                Assigned Instructor <span className="required">*</span>
              </label>
              <select
                id="tt-faculty"
                className={`form-select ${formErrors.faculty ? 'error' : ''}`}
                value={formData.faculty}
                onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
                required
              >
                <option value="">Select Faculty</option>
                {facultyList.map((f) => (
                  <option key={f._id} value={f._id}>{f.fullName} ({f.facultyId})</option>
                ))}
              </select>
              {formErrors.faculty && <span className="form-error-msg">{formErrors.faculty}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="tt-room-type" className="form-label">
                Room Venue Type <span className="required">*</span>
              </label>
              <select
                id="tt-room-type"
                className="form-select"
                value={formData.roomType}
                onChange={(e) => {
                  const newType = e.target.value;
                  let firstId = '';
                  if (newType === 'Classroom' && classroomsList[0]) firstId = classroomsList[0]._id;
                  if (newType === 'Lab' && labsList[0]) firstId = labsList[0]._id;
                  if (newType === 'Auditorium' && auditoriumsList[0]) firstId = auditoriumsList[0]._id;
                  setFormData({ ...formData, roomType: newType, roomId: firstId });
                }}
              >
                <option value="Classroom">Classroom</option>
                <option value="Lab">Computing Lab</option>
                <option value="Auditorium">Auditorium</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="tt-room-id" className="form-label">
                Allocated Space <span className="required">*</span>
              </label>
              <select
                id="tt-room-id"
                className={`form-select ${formErrors.roomId ? 'error' : ''}`}
                value={formData.roomId}
                onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                required
              >
                <option value="">Select Room</option>
                {getRoomOptions().map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              {formErrors.roomId && <span className="form-error-msg">{formErrors.roomId}</span>}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              id="btn-save-timetable"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Validating Conflicts & Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Schedule Session'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Timetable Session"
        itemName={deletingItem ? `${deletingItem.subject?.name} on ${deletingItem.day}` : ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default TimetablePage;
