import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const SemestersPage = () => {
  const [semesters, setSemesters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    academicYear: '2026-2027',
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Bulk delete states
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState(null);

  const { showToast, showError, showSuccess } = useToast();

  const fetchSemesters = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/semesters', params);
      if (res && res.data) {
        setSemesters(res.data);
      }
    } catch (err) {
      showError(err, { title: 'Failed to Load Semesters' });
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showError]);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      academicYear: '2026-2027',
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (semester) => {
    setEditingItem(semester);
    setFormData({
      name: semester.name,
      academicYear: semester.academicYear,
      status: semester.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Semester name/number is required';
    if (!formData.academicYear.trim()) {
      errs.academicYear = 'Academic year is required';
    } else if (!/^\d{4}-\d{4}$/.test(formData.academicYear.trim())) {
      errs.academicYear = 'Academic year must follow YYYY-YYYY format (e.g. 2026-2027)';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/admin/semesters/${editingItem._id}`, formData);
        showSuccess(`Semester '${formData.name}' Updated`, {
          message: 'Semester details saved successfully.'
        });
      } else {
        await api.post('/admin/semesters', formData);
        showSuccess(`Semester '${formData.name}' Created`, {
          message: 'New semester created successfully.'
        });
      }
      setIsModalOpen(false);
      fetchSemesters();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showError(err, { title: editingItem ? 'Failed to Update Semester' : 'Failed to Create Semester' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (semester) => {
    setDeletingItem(semester);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/semesters/${deletingItem._id}`);
      showSuccess(`Semester Deleted`, {
        message: `Semester '${deletingItem.name}' was deleted successfully.`
      });
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchSemesters();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete semester');
      showError(err, { title: 'Cannot Delete Semester' });
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
      const res = await api.delete('/admin/semesters/bulk', { ids: selectedIds });
      showSuccess('Semesters Deleted', {
        message: res.message || `${res.data?.deletedCount || selectedIds.length} semester(s) deleted successfully.`
      });
      if (res.data?.blockedCount > 0) {
        setSelectedIds(res.data.blockedItems.map((b) => b.id));
      } else {
        setSelectedIds([]);
      }
      setIsBulkDialogOpen(false);
      fetchSemesters();
    } catch (err) {
      const msg = err.message || 'Failed to delete selected semesters';
      setBulkDeleteError(msg);
      showError(err, { title: 'Cannot Delete Selected Semesters' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Semester Name',
      accessor: 'name',
      render: (row) => <span className="font-semibold text-primary">{row.name}</span>
    },
    {
      header: 'Academic Year',
      accessor: 'academicYear',
      render: (row) => <span className="text-secondary">{row.academicYear}</span>
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
          <h1 className="page-title">Semesters Management</h1>
          <p className="page-subtitle">
            Configure academic semesters and academic years for Computer Science curricula.
          </p>
        </div>
      </div>

      <DataTable
        title="All Semesters"
        subtitle="Active and archived academic terms"
        data={semesters}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading semesters..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by semester or year..."
        filters={
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
        }
        onAddClick={handleOpenAdd}
        addLabel="Add Semester"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No semesters registered yet"
        emptyDescription="Create your first academic term (e.g. Semester 1, 2026-2027)."
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
        title={editingItem ? 'Edit Semester' : 'Create Semester'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="semester-name" className="form-label">
              Semester Name / Term <span className="required">*</span>
            </label>
            <input
              id="semester-name"
              type="text"
              className={`form-input ${formErrors.name ? 'error' : ''}`}
              placeholder="e.g. Semester 1, Semester 3"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            {formErrors.name && <span className="form-error-msg">{formErrors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="academic-year" className="form-label">
              Academic Year (YYYY-YYYY) <span className="required">*</span>
            </label>
            <input
              id="academic-year"
              type="text"
              className={`form-input ${formErrors.academicYear ? 'error' : ''}`}
              placeholder="e.g. 2026-2027"
              value={formData.academicYear}
              onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
              required
            />
            {formErrors.academicYear && (
              <span className="form-error-msg">{formErrors.academicYear}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="semester-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="semester-status"
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
              disabled={isSubmitting}
              id="btn-save-semester"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Semester'
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
        title="Delete Semester"
        itemName={deletingItem ? `${deletingItem.name} (${deletingItem.academicYear})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Semesters"
        message={`Are you sure you want to delete ${selectedIds.length} selected semester(s)? This action cannot be undone.`}
        isDeleting={isBulkDeleting}
        error={bulkDeleteError}
      />
    </div>
  );
};

export default SemestersPage;
