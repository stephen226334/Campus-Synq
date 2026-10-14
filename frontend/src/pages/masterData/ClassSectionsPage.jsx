import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const ClassSectionsPage = () => {
  const [sections, setSections] = useState([]);
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

  // Bulk selection states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState(null);

  const { showToast } = useToast();

  const loadSemestersDropdown = async () => {
    try {
      const res = await api.get('/admin/semesters');
      if (res && res.data) {
        setSemestersList(res.data);
      }
    } catch (err) {
      console.error('Failed to load semesters:', err);
    }
  };

  const fetchSections = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (semesterFilter) params.semester = semesterFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/class-sections', params);
      if (res && res.data) {
        setSections(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load class sections', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, semesterFilter, statusFilter, showToast]);

  useEffect(() => {
    loadSemestersDropdown();
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      semester: semestersList[0]?._id || '',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (section) => {
    setEditingItem(section);
    setFormData({
      name: section.name,
      semester: section.semester?._id || section.semester || '',
      status: section.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Section name is required (e.g. Section A)';
    if (!formData.semester) {
      errs.semester = 'Please select a semester';
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
        semester: formData.semester,
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/class-sections/${editingItem._id}`, payload);
        showToast(`Section '${payload.name}' updated successfully`, 'success');
      } else {
        await api.post('/admin/class-sections', payload);
        showToast(`Section '${payload.name}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchSections();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save class section', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (section) => {
    setDeletingItem(section);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/class-sections/${deletingItem._id}`);
      showToast(`Section '${deletingItem.name}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchSections();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete section');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSelectAll = (visibleIds) => {
    setSelectedIds(visibleIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleOpenBulkDelete = () => {
    setBulkDeleteError(null);
    setIsBulkDialogOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    setBulkDeleteError(null);
    try {
      const res = await api.delete('/admin/class-sections/bulk', { ids: selectedIds });
      showToast(res.message || `${res.data?.deletedCount || selectedIds.length} sections deleted successfully`, 'success');
      if (res.data?.blockedCount > 0) {
        setSelectedIds(res.data.blockedItems.map((b) => b.id));
      } else {
        setSelectedIds([]);
      }
      setIsBulkDialogOpen(false);
      fetchSections();
    } catch (err) {
      const msg = err.message || 'Failed to delete selected sections';
      setBulkDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Section Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-primary">{row.name}</span>
    },
    {
      header: 'Assigned Semester',
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
    },
    {
      header: 'Created Date',
      accessor: 'createdAt',
      render: (row) => (
        <span className="text-muted text-sm">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      )
    }
  ];

  return (
    <div className="master-data-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Class Sections Management</h1>
          <p className="page-subtitle">
            Configure student cohorts and section batches (e.g. Section A, Section B) per semester.
          </p>
        </div>
      </div>

      <DataTable
        title="Class Sections"
        subtitle="Active cohort groupings by semester"
        data={sections}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading class sections..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by section name (e.g. Section A)..."
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
        addLabel="Add Section"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No class sections registered yet"
        emptyDescription="Create cohort sections such as Section A, Section B."
        selectable={true}
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleOpenBulkDelete}
        isBulkDeleting={isBulkDeleting}
        bulkDeleteLabel="Delete Selected"
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Class Section' : 'Create Class Section'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="section-name" className="form-label">
              Section Name <span className="required">*</span>
            </label>
            <input
              id="section-name"
              type="text"
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Section A, Section B, Batch 1"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <span className="form-error-msg">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="section-semester" className="form-label">
              Semester <span className="required">*</span>
            </label>
            {semestersList.length === 0 ? (
              <div className="field-helper-warning">
                No semesters registered yet. Please create a semester first.
              </div>
            ) : (
              <select
                id="section-semester"
                className={`form-select ${formErrors.semester ? 'error' : ''}`}
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                required
              >
                <option value="">Select Semester</option>
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
            <label htmlFor="section-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="section-status"
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
              id="btn-save-section"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Section'
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
        title="Delete Class Section"
        itemName={deletingItem ? deletingItem.name : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Class Sections"
        message={`Are you sure you want to delete ${selectedIds.length} selected class section(s)? This action cannot be undone.`}
        isDeleting={isBulkDeleting}
        error={bulkDeleteError}
      />
    </div>
  );
};

export default ClassSectionsPage;
