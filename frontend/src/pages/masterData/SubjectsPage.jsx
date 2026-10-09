import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const SubjectsPage = () => {
  const [subjects, setSubjects] = useState([]);
  const [semestersList, setSemestersList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    semester: '',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const { showToast } = useToast();

  const loadSemestersDropdown = async () => {
    try {
      const res = await api.get('/admin/semesters');
      if (res && res.data) {
        setSemestersList(res.data);
      }
    } catch (err) {
      console.error('Failed to load semesters dropdown:', err);
    }
  };

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (semesterFilter) params.semester = semesterFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/subjects', params);
      if (res && res.data) {
        setSubjects(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load subjects', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, semesterFilter, statusFilter, showToast]);

  useEffect(() => {
    loadSemestersDropdown();
  }, []);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      semester: semestersList[0]?._id || '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (subject) => {
    setEditingItem(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      semester: subject.semester?._id || subject.semester || '',
      status: subject.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Subject name is required';
    if (!formData.code.trim()) {
      errs.code = 'Subject code is required';
    }
    if (!formData.semester) {
      errs.semester = 'Please select a valid semester';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        semester: formData.semester,
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/subjects/${editingItem._id}`, payload);
        showToast(`Subject '${payload.code}' updated successfully`, 'success');
      } else {
        await api.post('/admin/subjects', payload);
        showToast(`Subject '${payload.code}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchSubjects();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save subject', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (subject) => {
    setDeletingItem(subject);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/subjects/${deletingItem._id}`);
      showToast(`Subject '${deletingItem.code}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchSubjects();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete subject');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Subject Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-primary">{row.name}</span>
    },
    {
      header: 'Code',
      accessor: 'code',
      render: (row) => <span className="code-badge">{row.code}</span>
    },
    {
      header: 'Semester',
      accessor: 'semester',
      render: (row) => (
        <span>
          {row.semester?.name ? `${row.semester.name} (${row.semester.academicYear})` : 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge status={row.status} />
    }
  ];

  return (
    <div className="master-data-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subjects Management</h1>
          <p className="page-subtitle">
            Configure Computer Science curriculum courses, syllabus codes, and semester allocations.
          </p>
        </div>
      </div>

      <DataTable
        title="Curriculum Subjects"
        subtitle="Full registry of departmental courses"
        data={subjects}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading subjects..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by subject name or code (e.g. CS101)..."
        filters={
          <>
            <select
              className="form-select table-filter-select"
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              aria-label="Filter by Semester"
            >
              <option value="">All Semesters</option>
              {semestersList.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} ({sem.academicYear})
                </option>
              ))}
            </select>

            <select
              className="form-select table-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by Status"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </>
        }
        onAddClick={handleOpenAdd}
        addLabel="Add Subject"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No subjects created yet"
        emptyDescription="Create courses such as Data Structures (CS101), Database Systems (CS201)."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Subject' : 'Create Subject'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="subject-name" className="form-label">
              Subject Name <span className="required">*</span>
            </label>
            <input
              id="subject-name"
              type="text"
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Object Oriented Programming"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <span className="form-error-msg">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="subject-code" className="form-label">
              Subject Code (Unique) <span className="required">*</span>
            </label>
            <input
              id="subject-code"
              type="text"
              className={`form-input uppercase ${formErrors.code ? 'error' : ''}`}
              placeholder="e.g. CS101, CS202"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              required
            />
            {formErrors.code && <span className="form-error-msg">{formErrors.code}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="subject-semester" className="form-label">
              Semester <span className="required">*</span>
            </label>
            {semestersList.length === 0 ? (
              <div className="field-helper-warning">
                No semesters registered yet. Please create a semester first before creating a subject.
              </div>
            ) : (
              <select
                id="subject-semester"
                className={`form-select ${formErrors.semester ? 'error' : ''}`}
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                required
              >
                <option value="">Select a Semester</option>
                {semestersList.map((sem) => (
                  <option key={sem._id} value={sem._id}>
                    {sem.name} ({sem.academicYear})
                  </option>
                ))}
              </select>
            )}
            {formErrors.semester && <span className="form-error-msg">{formErrors.semester}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="subject-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="subject-status"
              className="form-select"
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
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
              disabled={isSubmitting || semestersList.length === 0}
              id="btn-save-subject"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Subject'
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
        title="Delete Subject"
        itemName={deletingItem ? `${deletingItem.name} (${deletingItem.code})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
};

export default SubjectsPage;
