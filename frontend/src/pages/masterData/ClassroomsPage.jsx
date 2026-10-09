import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2 } from 'lucide-react';

export const ClassroomsPage = () => {
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    capacity: 60,
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

  const fetchClassrooms = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/classrooms', params);
      if (res && res.data) {
        setClassrooms(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load classrooms', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showToast]);

  useEffect(() => {
    fetchClassrooms();
  }, [fetchClassrooms]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      roomNumber: '',
      capacity: 60,
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room) => {
    setEditingItem(room);
    setFormData({
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      status: room.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.roomNumber.trim()) errs.roomNumber = 'Room number is required (e.g. CS-301)';
    if (!formData.capacity || Number(formData.capacity) < 1) {
      errs.capacity = 'Capacity must be at least 1 student';
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
        roomNumber: formData.roomNumber.trim().toUpperCase(),
        capacity: Number(formData.capacity),
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/classrooms/${editingItem._id}`, payload);
        showToast(`Classroom '${payload.roomNumber}' updated successfully`, 'success');
      } else {
        await api.post('/admin/classrooms', payload);
        showToast(`Classroom '${payload.roomNumber}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchClassrooms();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save classroom', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (room) => {
    setDeletingItem(room);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/classrooms/${deletingItem._id}`);
      showToast(`Classroom '${deletingItem.roomNumber}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchClassrooms();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete classroom');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Room Number',
      accessor: 'roomNumber',
      render: (row) => <span className="font-semibold text-primary font-mono">{row.roomNumber}</span>
    },
    {
      header: 'Seating Capacity',
      accessor: 'capacity',
      render: (row) => <span>{row.capacity} Seats</span>
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
          <h1 className="page-title">Classrooms Management</h1>
          <p className="page-subtitle">
            Configure lecture halls, theoretical classrooms, and capacity thresholds for CS department.
          </p>
        </div>
      </div>

      <DataTable
        title="Lecture Classrooms"
        subtitle="Master registry of department lecture facilities"
        data={classrooms}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading classrooms..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search room number (e.g. CS-301)..."
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
        addLabel="Add Classroom"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No classrooms registered yet"
        emptyDescription="Register lecture spaces such as CS-101, CS-201, CS-301."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Classroom' : 'Create Classroom'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="room-number" className="form-label">
              Room Number (Unique) <span className="required">*</span>
            </label>
            <input
              id="room-number"
              type="text"
              className={`form-input uppercase ${formErrors.roomNumber ? 'error' : ''}`}
              placeholder="e.g. CS-301, CS-302"
              value={formData.roomNumber}
              onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value.toUpperCase() })}
              required
            />
            {formErrors.roomNumber && (
              <span className="form-error-msg">{formErrors.roomNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="room-capacity" className="form-label">
              Seating Capacity (Students) <span className="required">*</span>
            </label>
            <input
              id="room-capacity"
              type="number"
              min="1"
              max="500"
              className={`form-input ${formErrors.capacity ? 'error' : ''}`}
              placeholder="e.g. 60"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              required
            />
            {formErrors.capacity && (
              <span className="form-error-msg">{formErrors.capacity}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="room-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="room-status"
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
              id="btn-save-classroom"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Classroom'
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
        title="Delete Classroom"
        itemName={deletingItem ? `Room ${deletingItem.roomNumber}` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />
    </div>
  );
};

export default ClassroomsPage;
