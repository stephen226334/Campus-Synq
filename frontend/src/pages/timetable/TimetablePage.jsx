import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Filter,
  CheckSquare,
  X
} from 'lucide-react';
import {
  sortTimetableEntries,
  sortPeriodsChronologically,
  formatPeriodTimeRange
} from '../../utils/timetableSort';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const sortPeriodsAcademic = (list) => {
  return sortPeriodsChronologically(list);
};

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

  // Bulk selection state (tracked by stable MongoDB ObjectIds)
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedEntriesMap, setSelectedEntriesMap] = useState(new Map());
  const headerCheckboxRef = useRef(null);

  // Bulk delete confirmation modal state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState(null);

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

  // Conflict confirmation modal state
  const [conflictData, setConflictData] = useState(null);
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [isConfirmingConflict, setIsConfirmingConflict] = useState(false);

  // Delete modal state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast, showError, showSuccess, showWarning } = useToast();

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

      if (pers?.data) setPeriodsList(sortPeriodsAcademic(pers.data));
      if (sems?.data) setSemestersList(sems.data);
      if (secs?.data) setSectionsList(secs.data);
      if (subs?.data) setSubjectsList(subs.data);
      if (facs?.data) setFacultyList(facs.data);
      if (rooms?.data) setClassroomsList(rooms.data);
      if (labs?.data) setLabsList(labs.data);
      if (auds?.data) setAuditoriumsList(auds.data);
    } catch (err) {
      console.error('Failed to load master data for timetable:', err);
      showError(err, { title: 'Failed to Load Academic Resources' });
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
        setEntries(sortTimetableEntries(res.data));
      }
    } catch (err) {
      showError(err, { title: 'Failed to Load Timetable' });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDay, semesterFilter, sectionFilter, facultyFilter, showError]);

  useEffect(() => {
    loadAllMasterData();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [fetchTimetable]);

  const handleOpenAdd = () => {
    setEditingItem(null);

    let targetSectionId = sectionFilter || '';
    let targetSemesterId = semesterFilter || '';

    if (targetSectionId) {
      const sec = sectionsList.find((s) => s._id === targetSectionId);
      if (sec && sec.semester) {
        targetSemesterId = (sec.semester._id || sec.semester).toString();
      }
    } else if (!targetSemesterId && semestersList.length > 0) {
      targetSemesterId = semestersList[0]._id;
    }

    const availableSections = sectionsList.filter(
      (s) => (s.semester?._id || s.semester)?.toString() === targetSemesterId?.toString()
    );
    if (!targetSectionId && availableSections.length > 0) {
      targetSectionId = availableSections[0]._id;
    }

    const availableSubjects = subjectsList.filter(
      (sub) => (sub.semester?._id || sub.semester)?.toString() === targetSemesterId?.toString()
    );

    setFormData({
      day: selectedDay !== 'ALL' ? selectedDay : 'Monday',
      period: periodsList[0]?._id || '',
      semester: targetSemesterId || '',
      section: targetSectionId || '',
      subject: availableSubjects[0]?._id || '',
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

  const handleModalSemesterChange = (newSemId) => {
    const matchingSections = sectionsList.filter(
      (s) => (s.semester?._id || s.semester)?.toString() === newSemId?.toString()
    );
    const matchingSubjects = subjectsList.filter(
      (sub) => (sub.semester?._id || sub.semester)?.toString() === newSemId?.toString()
    );
    setFormData((prev) => ({
      ...prev,
      semester: newSemId,
      section: matchingSections[0]?._id || '',
      subject: matchingSubjects[0]?._id || ''
    }));
  };

  const handleModalSectionChange = (newSecId) => {
    const sec = sectionsList.find((s) => s._id === newSecId);
    const secSemId = (sec?.semester?._id || sec?.semester)?.toString();
    setFormData((prev) => {
      const updated = { ...prev, section: newSecId };
      if (secSemId && secSemId !== prev.semester?.toString()) {
        updated.semester = secSemId;
        const matchingSubjects = subjectsList.filter(
          (sub) => (sub.semester?._id || sub.semester)?.toString() === secSemId
        );
        if (!matchingSubjects.some((sub) => sub._id === prev.subject)) {
          updated.subject = matchingSubjects[0]?._id || '';
        }
      }
      return updated;
    });
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
        showSuccess('Timetable Session Updated', {
          message: 'The timetable session was updated successfully.'
        });
      } else {
        await api.post('/admin/timetable', formData);
        showSuccess('Timetable Session Scheduled', {
          message: 'The timetable session was scheduled successfully.'
        });
      }
      setIsModalOpen(false);
      fetchTimetable();
    } catch (err) {
      // Check if error is an overridable scheduling conflict (Combined Class / Faculty Conflict)
      const errDetails = err.data?.details || err.data?.errors || err.errors;
      const canOverride = Boolean(
        errDetails?.canOverride ||
        err.data?.canOverride ||
        (err.status === 409 && (errDetails?.conflictType === 'COMBINED_CLASS' || errDetails?.conflictType === 'FACULTY'))
      );

      if (canOverride) {
        // Resolve labels for proposed session for side-by-side comparison
        const facultyObj = facultyList.find((f) => f._id === formData.faculty);
        const subjectObj = subjectsList.find((s) => s._id === formData.subject);
        const sectionObj = sectionsList.find((s) => s._id === formData.section);
        const periodObj = periodsList.find((p) => p._id === formData.period);
        const roomObj = getRoomOptions().find((r) => r.id === formData.roomId);

        setConflictData({
          conflictType: errDetails?.conflictType || 'COMBINED_CLASS',
          message: err.data?.message || err.message,
          recommendation: err.data?.recommendation || '',
          existingEntry: errDetails?.existingEntry || null,
          proposedEntry: {
            facultyName: facultyObj?.fullName || 'Faculty Member',
            facultyId: facultyObj?.facultyId || '',
            subjectName: subjectObj?.name || 'Subject Course',
            subjectCode: subjectObj?.code || '',
            sectionName: sectionObj?.name || 'Section',
            roomNumber: roomObj?.label || 'Selected Room',
            day: formData.day,
            periodLabel: periodObj ? `${periodObj.periodNumber} (${periodObj.startTime} - ${periodObj.endTime})` : 'Selected Period'
          }
        });
        setIsConflictDialogOpen(true);
      } else {
        setFormErrors({ submit: err.message });
        showError(err, { title: editingItem ? 'Failed to Update Session' : 'Failed to Schedule Session' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelConflict = () => {
    setIsConflictDialogOpen(false);
    setConflictData(null);
    // Preserves existing form values in formData!
  };

  const handleConfirmConflict = async () => {
    if (!conflictData) return;
    setIsConfirmingConflict(true);

    try {
      const payload = {
        ...formData,
        overrideConflict: true,
        allowCombinedClass: true
      };

      if (editingItem) {
        await api.put(`/admin/timetable/${editingItem._id}`, payload);
        showSuccess('Combined Session Updated', {
          message: 'The combined timetable session was updated successfully.'
        });
      } else {
        await api.post('/admin/timetable', payload);
        showSuccess('Combined Class Scheduled', {
          message: `Successfully scheduled combined class session for ${conflictData.proposedEntry?.sectionName || 'the section'}.`
        });
      }

      setIsConflictDialogOpen(false);
      setConflictData(null);
      setIsModalOpen(false);
      fetchTimetable();
    } catch (err) {
      showError(err, { title: 'Failed to Confirm Combined Session' });
      setIsConflictDialogOpen(false);
      setFormErrors({ submit: err.message });
    } finally {
      setIsConfirmingConflict(false);
    }
  };

  const handleOpenDelete = (entry) => {
    setDeletingItem(entry);
    setIsDeleteDialogOpen(true);
  };

  const visibleIds = entries.map((e) => e._id);
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
  const isAllVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const isIndeterminate = selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  // Toggle single row selection
  const handleToggleRow = (entry) => {
    const id = entry._id;
    setSelectedIds((prev) => {
      const isSelected = prev.includes(id);
      if (isSelected) {
        return prev.filter((item) => item !== id);
      } else {
        return [...prev, id];
      }
    });

    setSelectedEntriesMap((prevMap) => {
      const newMap = new Map(prevMap);
      if (newMap.has(id)) {
        newMap.delete(id);
      } else {
        newMap.set(id, entry);
      }
      return newMap;
    });
  };

  // Toggle select all visible
  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      // Deselect all visible
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      setSelectedEntriesMap((prevMap) => {
        const newMap = new Map(prevMap);
        visibleIds.forEach((id) => newMap.delete(id));
        return newMap;
      });
    } else {
      // Select all visible
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        visibleIds.forEach((id) => newSet.add(id));
        return Array.from(newSet);
      });
      setSelectedEntriesMap((prevMap) => {
        const newMap = new Map(prevMap);
        entries.forEach((e) => newMap.set(e._id, e));
        return newMap;
      });
    }
  };

  // Explicit select all visible
  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      visibleIds.forEach((id) => newSet.add(id));
      return Array.from(newSet);
    });
    setSelectedEntriesMap((prevMap) => {
      const newMap = new Map(prevMap);
      entries.forEach((e) => newMap.set(e._id, e));
      return newMap;
    });
  };

  // Clear all selections
  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectedEntriesMap(new Map());
  };

  // Open bulk delete confirmation modal
  const handleOpenBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setBulkDeleteError(null);
    setIsBulkDeleteDialogOpen(true);
  };

  // Confirm and execute bulk delete
  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0 || isBulkDeleting) return;

    setIsBulkDeleting(true);
    setBulkDeleteError(null);

    try {
      const response = await api.delete('/admin/timetable/bulk', { ids: selectedIds });

      const deletedCount = response?.data?.deletedCount ?? response?.deletedCount ?? selectedIds.length;
      const failedCount = response?.data?.failedCount ?? response?.failedCount ?? 0;
      const deletedIds = response?.data?.deletedIds ?? response?.deletedIds ?? selectedIds;

      if (failedCount > 0) {
        showWarning(
          `${deletedCount} entries deleted. ${failedCount} entries could not be deleted. Review the failed entries and retry if appropriate.`,
          { title: 'Partial Bulk Deletion' }
        );
        // Remove successfully deleted IDs from selection, preserve failed ones
        setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
        setSelectedEntriesMap((prevMap) => {
          const newMap = new Map(prevMap);
          deletedIds.forEach((id) => newMap.delete(id));
          return newMap;
        });
      } else {
        showSuccess(
          `${deletedCount} timetable ${deletedCount === 1 ? 'entry' : 'entries'} deleted successfully.`,
          { title: 'Bulk Deletion Complete' }
        );
        // Clear entire selection
        setSelectedIds([]);
        setSelectedEntriesMap(new Map());
      }

      setIsBulkDeleteDialogOpen(false);
      // Refresh timetable data
      fetchTimetable();
    } catch (err) {
      console.error('Bulk delete failed:', err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to delete the selected timetable entries. Your selection has been preserved.';
      setBulkDeleteError(errorMsg);
      showError(err, {
        title: 'Bulk Deletion Failed',
        fallbackMessage: 'Unable to delete the selected timetable entries. Your selection has been preserved.'
      });
      // Selection is preserved intact!
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/timetable/${deletingItem._id}`);
      showSuccess('Timetable Session Deleted', {
        message: 'The timetable session has been deleted.'
      });
      // Remove from selection if present
      setSelectedIds((prev) => prev.filter((id) => id !== deletingItem._id));
      setSelectedEntriesMap((prevMap) => {
        const newMap = new Map(prevMap);
        newMap.delete(deletingItem._id);
        return newMap;
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchTimetable();
    } catch (err) {
      showError(err, { title: 'Failed to Delete Session' });
    } finally {
      setIsDeleting(false);
    }
  };

  const activeSectionObj = sectionFilter
    ? sectionsList.find((s) => s._id === sectionFilter)
    : null;

  const modalSections = sectionsList.filter(
    (sec) => (sec.semester?._id || sec.semester)?.toString() === formData.semester?.toString()
  );
  const modalSubjects = subjectsList.filter(
    (sub) => (sub.semester?._id || sub.semester)?.toString() === formData.semester?.toString()
  );

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

      {/* Day Selector Tabs & Filters */}
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

          {/* Dedicated Class Section Filter with Semester Grouping */}
          <select
            id="filter-section-select"
            className="form-select table-filter-select"
            value={sectionFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSectionFilter(val);
              if (val) {
                const sec = sectionsList.find((s) => s._id === val);
                const semId = sec?.semester?._id || sec?.semester;
                if (semId) setSemesterFilter(semId.toString());
              }
            }}
            style={{ width: 'auto', minWidth: '180px' }}
            aria-label="Filter by Class Section"
          >
            <option value="">All Class Sections</option>
            {semestersList.map((sem) => {
              const semSections = sectionsList.filter(
                (sec) => (sec.semester?._id || sec.semester)?.toString() === sem._id?.toString()
              );
              if (semSections.length === 0) return null;
              return (
                <optgroup key={sem._id} label={sem.name}>
                  {semSections.map((sec) => (
                    <option key={sec._id} value={sec._id}>
                      {sem.name} — Section {sec.name}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>

          <select
            className="form-select table-filter-select"
            value={semesterFilter}
            onChange={(e) => {
              const val = e.target.value;
              setSemesterFilter(val);
              if (sectionFilter) {
                const curSec = sectionsList.find((s) => s._id === sectionFilter);
                const curSemId = (curSec?.semester?._id || curSec?.semester)?.toString();
                if (val && curSemId !== val) {
                  setSectionFilter('');
                }
              }
            }}
            style={{ width: 'auto', minWidth: '140px' }}
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
            style={{ width: 'auto', minWidth: '140px' }}
            aria-label="Filter by Faculty"
          >
            <option value="">All Faculty</option>
            {facultyList.map((f) => (
              <option key={f._id} value={f._id}>{f.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Section Indicator Banner */}
      {activeSectionObj && (
        <div
          className="active-section-banner card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(90deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.08) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-main)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Layers size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2px' }}>
                <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: '700' }}>
                  Managing Timetable For
                </span>
                <span className="badge badge-active font-mono" style={{ fontSize: '0.72rem', padding: '1px 7px' }}>
                  {entries.length} Sessions on {selectedDay}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                {activeSectionObj.semester?.name || 'Semester'} — Section {activeSectionObj.name}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleOpenAdd}
              id="btn-schedule-for-active-section"
            >
              <Plus size={15} />
              <span>Add Session to Section {activeSectionObj.name}</span>
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSectionFilter('')}
              title="View all class sections"
              id="btn-clear-section-filter"
            >
              <X size={15} />
              <span>Clear Section Filter</span>
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="timetable-bulk-toolbar" role="toolbar" aria-label="Bulk actions toolbar">
          <div className="bulk-toolbar-left">
            <span className="bulk-toolbar-count-badge">
              <CheckSquare size={16} />
              <strong>{selectedIds.length}</strong> selected
            </span>
            <span className="bulk-toolbar-divider">|</span>
            <button
              type="button"
              className="bulk-toolbar-btn"
              onClick={handleSelectAllVisible}
              title="Select all rows currently displayed in the table"
              id="btn-bulk-select-all"
            >
              Select All
            </button>
            <button
              type="button"
              className="bulk-toolbar-btn"
              onClick={handleClearSelection}
              title="Clear all selections"
              id="btn-bulk-clear-selection"
            >
              <X size={14} style={{ marginRight: '4px' }} />
              Clear Selection
            </button>
          </div>
          <div className="bulk-toolbar-right">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleOpenBulkDelete}
              disabled={isBulkDeleting}
              id="btn-bulk-delete"
            >
              <Trash2 size={15} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

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
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    <input
                      ref={headerCheckboxRef}
                      type="checkbox"
                      className="timetable-checkbox"
                      checked={isAllVisibleSelected}
                      onChange={handleToggleSelectAllVisible}
                      aria-label="Select all displayed timetable entries"
                      id="checkbox-select-all-header"
                    />
                  </th>
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
                {entries.map((entry) => {
                  const isSelected = selectedIds.includes(entry._id);
                  return (
                    <tr key={entry._id} className={isSelected ? 'timetable-row-selected' : ''}>
                      <td style={{ textAlign: 'center', width: '44px' }}>
                        <input
                          type="checkbox"
                          className="timetable-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(entry)}
                          aria-label={`Select ${entry.subject?.name || 'session'} on ${entry.day}`}
                          id={`checkbox-row-${entry._id}`}
                        />
                      </td>
                      <td>
                        <span className="font-semibold text-primary">{entry.day}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {entry.period ? (
                            <>
                              <span className="code-badge font-mono" style={{ alignSelf: 'flex-start' }}>
                                {entry.period.periodNumber || 'Period'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {formatPeriodTimeRange(entry.period)}
                              </span>
                            </>
                          ) : (
                            <>
                              <span
                                className="code-badge font-mono"
                                style={{
                                  alignSelf: 'flex-start',
                                  background: 'var(--warning-soft, #fef3c7)',
                                  color: 'var(--warning-dark, #b45309)'
                                }}
                              >
                                Unassigned Period
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', fontStyle: 'italic' }}>
                                Time Unspecified
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span className="font-semibold">{entry.subject?.name}</span>
                          <span className="text-muted text-sm">{entry.subject?.code}</span>
                          {entry.isCombinedClass && (
                            <span className="badge-combined-class">
                              Combined Class
                            </span>
                          )}
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
                  );
                })}
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
                onChange={(e) => handleModalSemesterChange(e.target.value)}
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
                onChange={(e) => handleModalSectionChange(e.target.value)}
                required
                disabled={!formData.semester}
              >
                <option value="">{formData.semester ? 'Select Section' : 'Select Semester first'}</option>
                {modalSections.map((sec) => (
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
                disabled={!formData.semester}
              >
                <option value="">{formData.semester ? 'Select Subject' : 'Select Semester first'}</option>
                {modalSubjects.map((sub) => (
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

      {/* Intentional Combined Class / Conflict Confirmation Dialog */}
      <Modal
        isOpen={isConflictDialogOpen}
        onClose={isConfirmingConflict ? undefined : handleCancelConflict}
        title={conflictData?.conflictType === 'COMBINED_CLASS' ? 'Combined Class Confirmation' : 'Faculty Scheduling Conflict'}
        maxWidth="620px"
      >
        <div style={{ padding: '0.25rem 0' }}>
          {/* Conflict Warning Header Banner */}
          <div className="conflict-modal-banner">
            <div style={{ color: 'var(--primary-main, #6d3df5)', flexShrink: 0, marginTop: '2px' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary, #0f172a)', marginBottom: '0.25rem' }}>
                {conflictData?.conflictType === 'COMBINED_CLASS'
                  ? 'Intentional Combined Class Detected'
                  : 'Faculty Schedule Conflict Detected'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #475569)', lineHeight: 1.5 }}>
                {conflictData?.message}
              </div>
            </div>
          </div>

          {/* Session Comparison Cards */}
          <div className="conflict-cards-comparison">
            {/* Existing Session Card */}
            <div className="conflict-session-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted, #64748b)', letterSpacing: '0.05em' }}>
                  Existing Session
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: '#e0e7ff',
                    color: '#3730a3'
                  }}
                >
                  On Timetable
                </span>
              </div>
              {conflictData?.existingEntry ? (
                <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Course: </strong>
                    <span>{conflictData.existingEntry.subjectName}</span>
                    {conflictData.existingEntry.subjectCode && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({conflictData.existingEntry.subjectCode})</span>
                    )}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Section: </strong>
                    <span style={{ color: 'var(--primary-main)', fontWeight: 600 }}>{conflictData.existingEntry.sectionName}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Faculty: </strong>
                    <span>{conflictData.existingEntry.facultyName}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Venue: </strong>
                    <span>{conflictData.existingEntry.roomNumber}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Slot: </strong>
                    <span>{conflictData.existingEntry.day}, {conflictData.existingEntry.periodLabel}</span>
                  </div>
                </div>
              ) : (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Currently scheduled active session.</p>
              )}
            </div>

            {/* Proposed Session Card */}
            <div className="conflict-session-card proposed">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary-main, #6d3df5)', letterSpacing: '0.05em' }}>
                  Proposed Session
                </span>
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'var(--primary-main, #6d3df5)',
                    color: '#ffffff'
                  }}
                >
                  To Schedule
                </span>
              </div>
              {conflictData?.proposedEntry ? (
                <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Course: </strong>
                    <span>{conflictData.proposedEntry.subjectName}</span>
                    {conflictData.proposedEntry.subjectCode && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}> ({conflictData.proposedEntry.subjectCode})</span>
                    )}
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Section: </strong>
                    <span style={{ color: 'var(--primary-main)', fontWeight: 600 }}>{conflictData.proposedEntry.sectionName}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Faculty: </strong>
                    <span>{conflictData.proposedEntry.facultyName}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Venue: </strong>
                    <span>{conflictData.proposedEntry.roomNumber}</span>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--text-primary)' }}>Slot: </strong>
                    <span>{conflictData.proposedEntry.day}, {conflictData.proposedEntry.periodLabel}</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Explanation note */}
          <div className="conflict-info-note">
            <strong>Combined Class Policy:</strong> Confirming allows the faculty member to teach these multiple class sections together (e.g. combined electives in the same room). The existing session will <em>not</em> be deleted or overwritten.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelConflict}
              disabled={isConfirmingConflict}
              id="btn-conflict-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmConflict}
              disabled={isConfirmingConflict}
              id="btn-conflict-confirm"
            >
              {isConfirmingConflict ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Scheduling Combined Session...</span>
                </>
              ) : (
                'Confirm & Schedule Anyway'
              )}
            </button>
          </div>
        </div>
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

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteDialogOpen}
        onClose={() => {
          if (!isBulkDeleting) {
            setIsBulkDeleteDialogOpen(false);
            setBulkDeleteError(null);
          }
        }}
        title="Delete Selected Timetable Entries?"
        maxWidth="640px"
      >
        <div style={{ padding: '0.25rem 0' }}>
          <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div style={{ color: 'var(--status-danger-text, #ef4444)', flexShrink: 0, marginTop: '2px' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p style={{ margin: '0 0 0.35rem 0', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                You are about to delete <strong>{selectedIds.length}</strong> timetable {selectedIds.length === 1 ? 'entry' : 'entries'}.
              </p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                This action cannot be undone. Associated substitution requests referencing these entries will also be removed. Review the selection before continuing.
              </p>
            </div>
          </div>

          {bulkDeleteError && (
            <div className="alert-box alert-error" role="alert" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{bulkDeleteError}</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                Selected Entries Review ({selectedIds.length})
              </span>
            </div>
            <div className="bulk-delete-summary-container">
              {selectedIds.map((id) => {
                const item = selectedEntriesMap.get(id);
                if (!item) {
                  return (
                    <div key={id} className="bulk-delete-item-row">
                      <span className="font-mono text-xs text-muted">ID: {id}</span>
                    </div>
                  );
                }
                return (
                  <div key={id} className="bulk-delete-item-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: '85px' }}>
                      <span className="badge badge-primary font-semibold" style={{ fontSize: '0.72rem' }}>
                        {item.day}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {item.subject?.name || 'Class Session'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {item.subject?.code ? `${item.subject?.code} • ` : ''}
                        {item.semester?.name || ''} {item.section?.name ? `(${item.section?.name})` : ''}
                      </div>
                    </div>
                    <div style={{ minWidth: '120px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.faculty?.fullName || 'No Faculty'}
                    </div>
                    <div style={{ minWidth: '80px', fontSize: '0.8rem', textAlign: 'right', color: 'var(--primary-main)', fontWeight: 600 }}>
                      {item.roomDetails?.roomNumber || item.roomType || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setIsBulkDeleteDialogOpen(false);
                setBulkDeleteError(null);
              }}
              disabled={isBulkDeleting}
              id="btn-bulk-delete-cancel"
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmBulkDelete}
              disabled={isBulkDeleting}
              id="btn-bulk-delete-confirm"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Deleting {selectedIds.length} Entries...</span>
                </>
              ) : (
                <>
                  <Trash2 size={15} />
                  <span>Delete {selectedIds.length} {selectedIds.length === 1 ? 'Entry' : 'Entries'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TimetablePage;
