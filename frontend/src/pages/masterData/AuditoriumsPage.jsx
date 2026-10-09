import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const AuditoriumsPage = () => {
  const [auditoriums, setAuditoriums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    auditoriumName: '',
    auditoriumNumber: '',
    capacity: 250,
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

  const fetchAuditoriums = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/auditoriums', params);
      if (res && res.data) {
        setAuditoriums(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load auditoriums', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showToast]);

  useEffect(() => {
    fetchAuditoriums();
  }, [fetchAuditoriums]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      auditoriumName: '',
      auditoriumNumber: '',
      capacity: 250,
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (aud) => {
    setEditingItem(aud);
    setFormData({
      auditoriumName: aud.auditoriumName,
      auditoriumNumber: aud.auditoriumNumber,
      capacity: aud.capacity,
      status: aud.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.auditoriumName.trim()) {
      errs.auditoriumName = 'Auditorium name is required';
    }
    if (!formData.auditoriumNumber.trim()) {
      errs.auditoriumNumber = 'Auditorium number is required (e.g. AUD-01)';
    }
    if (!formData.capacity || Number(formData.capacity) < 1) {
      errs.capacity = 'Capacity must be at least 1 seat';
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
        auditoriumName: formData.auditoriumName.trim(),
        auditoriumNumber: formData.auditoriumNumber.trim().toUpperCase(),
        capacity: Number(formData.capacity),
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/auditoriums/${editingItem._id}`, payload);
        showToast(`Auditorium '${payload.auditoriumNumber}' updated successfully`, 'success');
      } else {
        await api.post('/admin/auditoriums', payload);
        showToast(`Auditorium '${payload.auditoriumNumber}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchAuditoriums();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save auditorium', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (aud) => {
    setDeletingItem(aud);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/auditoriums/${deletingItem._id}`);
      showToast(`Auditorium '${deletingItem.auditoriumNumber}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchAuditoriums();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete auditorium');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Auditorium Name',
      accessor: 'auditoriumName',
      render: (row) => <span className="font-semibold text-primary">{row.auditoriumName}</span>
    },
    {
      header: 'Hall Number',
      accessor: 'auditoriumNumber',
      render: (row) => <span className="code-badge font-mono">{row.auditoriumNumber}</span>
    },
    {
      header: 'Audience Capacity',
      accessor: 'capacity',
      render: (row) => <span>{row.capacity} Seats</span>
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
          <h1 className="page-title">Auditoriums Management</h1>
          <p className="page-subtitle">
            Configure department seminar halls, conference auditoriums, and symposium venues.
          </p>
        </div>
      </div>

      <DataTable
        title="Department Auditoriums"
        subtitle="Auditoriums and grand seminar halls"
        data={auditoriums}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading auditoriums..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search auditorium by name or number (e.g. AUD-01)..."
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
        addLabel="Add Auditorium"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No auditoriums registered yet"
        emptyDescription="Register department halls such as Main Auditorium, Seminar Hall 1."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Auditorium' : 'Create Auditorium'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="aud-name" className="form-label">
              Auditorium / Hall Name <span className="required">*</span>
            </label>
            <input
              id="aud-name"
              type="text"
              className={`form-input ${formErrors.auditoriumName ? 'error' : ''}`}
              placeholder="e.g. Alan Turing Grand Auditorium"
              value={formData.auditoriumName}
              onChange={(e) => setFormData({ ...formData, auditoriumName: e.target.value })}
              required
            />
            {formErrors.auditoriumName && (
              <span className="form-error-msg">{formErrors.auditoriumName}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="aud-number" className="form-label">
              Auditorium Code / Number (Unique) <span className="required">*</span>
            </label>
            <input
              id="aud-number"
              type="text"
              className={`form-input uppercase ${formErrors.auditoriumNumber ? 'error' : ''}`}
              placeholder="e.g. AUD-01, AUD-CS-MAIN"
              value={formData.auditoriumNumber}
              onChange={(e) => setFormData({ ...formData, auditoriumNumber: e.target.value.toUpperCase() })}
              required
            />
            {formErrors.auditoriumNumber && (
              <span className="form-error-msg">{formErrors.auditoriumNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="aud-capacity" className="form-label">
              Seating Capacity (Seats) <span className="required">*</span>
            </label>
            <input
              id="aud-capacity"
              type="number"
              min="1"
              max="2000"
              className={`form-input ${formErrors.capacity ? 'error' : ''}`}
              placeholder="e.g. 350"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
            {formErrors.capacity && (
              <span className="form-error-msg">{formErrors.capacity}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="aud-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="aud-status"
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
              id="btn-save-auditorium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Auditorium'
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
        title="Delete Auditorium"
        itemName={deletingItem ? `${deletingItem.auditoriumName} (${deletingItem.auditoriumNumber})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
};

export default AuditoriumsPage;
