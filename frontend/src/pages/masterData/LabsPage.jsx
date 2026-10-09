import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const LabsPage = () => {
  const [labs, setLabs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    labName: '',
    labNumber: '',
    capacity: 35,
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

  const fetchLabs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/labs', params);
      if (res && res.data) {
        setLabs(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load laboratory facilities', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showToast]);

  useEffect(() => {
    fetchLabs();
  }, [fetchLabs]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      labName: '',
      labNumber: '',
      capacity: 35,
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lab) => {
    setEditingItem(lab);
    setFormData({
      labName: lab.labName,
      labNumber: lab.labNumber,
      capacity: lab.capacity,
      status: lab.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.labName.trim()) errs.labName = 'Lab name is required (e.g. AI & ML Lab)';
    if (!formData.labNumber.trim()) {
      errs.labNumber = 'Lab number is required (e.g. LAB-01)';
    }
    if (!formData.capacity || Number(formData.capacity) < 1) {
      errs.capacity = 'Capacity must be at least 1 workstation';
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
        labName: formData.labName.trim(),
        labNumber: formData.labNumber.trim().toUpperCase(),
        capacity: Number(formData.capacity),
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/labs/${editingItem._id}`, payload);
        showToast(`Lab '${payload.labNumber}' updated successfully`, 'success');
      } else {
        await api.post('/admin/labs', payload);
        showToast(`Lab '${payload.labNumber}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchLabs();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save laboratory', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (lab) => {
    setDeletingItem(lab);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/labs/${deletingItem._id}`);
      showToast(`Lab '${deletingItem.labNumber}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchLabs();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete lab');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Lab Name',
      accessor: 'labName',
      render: (row) => <span className="font-semibold text-primary">{row.labName}</span>
    },
    {
      header: 'Lab Identifier',
      accessor: 'labNumber',
      render: (row) => <span className="code-badge font-mono">{row.labNumber}</span>
    },
    {
      header: 'Workstations / Capacity',
      accessor: 'capacity',
      render: (row) => <span>{row.capacity} Stations</span>
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
          <h1 className="page-title">Laboratories Management</h1>
          <p className="page-subtitle">
            Configure computing laboratories, hardware facilities, and workstation allocations.
          </p>
        </div>
      </div>

      <DataTable
        title="Computer Science Laboratories"
        subtitle="Department computing labs and research facilities"
        data={labs}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading laboratories..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by lab name or number (e.g. LAB-01)..."
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
        addLabel="Add Lab"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No computing labs registered yet"
        emptyDescription="Register computing centers such as Programming Lab, AI/ML Lab."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Laboratory' : 'Create Laboratory'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="lab-name" className="form-label">
              Laboratory Name <span className="required">*</span>
            </label>
            <input
              id="lab-name"
              type="text"
              className={`form-input ${formErrors.labName ? 'error' : ''}`}
              placeholder="e.g. High Performance Computing Lab"
              value={formData.labName}
              onChange={(e) => setFormData({ ...formData, labName: e.target.value })}
              required
            />
            {formErrors.labName && <span className="form-error-msg">{formErrors.labName}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="lab-number" className="form-label">
              Lab Identifier / Number (Unique) <span className="required">*</span>
            </label>
            <input
              id="lab-number"
              type="text"
              className={`form-input uppercase ${formErrors.labNumber ? 'error' : ''}`}
              placeholder="e.g. LAB-01, LAB-CS-02"
              value={formData.labNumber}
              onChange={(e) => setFormData({ ...formData, labNumber: e.target.value.toUpperCase() })}
              required
            />
            {formErrors.labNumber && (
              <span className="form-error-msg">{formErrors.labNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lab-capacity" className="form-label">
              Capacity (Workstations) <span className="required">*</span>
            </label>
            <input
              id="lab-capacity"
              type="number"
              min="1"
              max="200"
              className={`form-input ${formErrors.capacity ? 'error' : ''}`}
              placeholder="e.g. 35"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
            {formErrors.capacity && (
              <span className="form-error-msg">{formErrors.capacity}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lab-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="lab-status"
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
              id="btn-save-lab"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Lab'
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
        title="Delete Laboratory"
        itemName={deletingItem ? `${deletingItem.labName} (${deletingItem.labNumber})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
};

export default LabsPage;
