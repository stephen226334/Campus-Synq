import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import { Loader2, Clock } from 'lucide-react';
import { sortPeriodsChronologically, parseTimeToMinutes } from '../../utils/timetableSort';

const sortPeriodsAcademic = (list) => {
  return sortPeriodsChronologically(list);
};

export const PeriodsPage = () => {
  const [periods, setPeriods] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    periodNumber: '',
    startTime: '9:00 AM',
    endTime: '9:50 AM',
    order: 1,
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

  const fetchPeriods = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/periods', params);
      if (res && res.data) {
        setPeriods(sortPeriodsAcademic(res.data));
      }
    } catch (err) {
      showToast(err.message || 'Failed to load periods', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, showToast]);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    const nextOrder = periods.length + 1;
    const nextP = `P${nextOrder}`;
    setFormData({
      periodNumber: nextP,
      startTime: '9:00 AM',
      endTime: '9:50 AM',
      order: nextOrder,
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (period) => {
    setEditingItem(period);
    setFormData({
      periodNumber: period.periodNumber,
      startTime: period.startTime,
      endTime: period.endTime,
      order: period.order || 1,
      status: period.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.periodNumber.trim()) errs.periodNumber = 'Period number is required (e.g. P1, P2)';
    if (!formData.startTime.trim()) {
      errs.startTime = 'Start time is required (e.g. 9:00 AM)';
    }
    if (!formData.endTime.trim()) {
      errs.endTime = 'End time is required (e.g. 9:50 AM)';
    }
    if (formData.startTime.trim() && formData.endTime.trim()) {
      const startM = parseTimeToMinutes(formData.startTime);
      const endM = parseTimeToMinutes(formData.endTime);
      if (startM >= endM) {
        errs.endTime = 'Period start time must be earlier than end time';
      }
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
        periodNumber: formData.periodNumber.trim().toUpperCase(),
        startTime: formData.startTime.trim(),
        endTime: formData.endTime.trim(),
        order: Number(formData.order) || 1,
        status: formData.status
      };

      if (editingItem) {
        await api.put(`/admin/periods/${editingItem._id}`, payload);
        showToast(`Period '${payload.periodNumber}' updated successfully`, 'success');
      } else {
        await api.post('/admin/periods', payload);
        showToast(`Period '${payload.periodNumber}' created successfully`, 'success');
      }
      setIsModalOpen(false);
      fetchPeriods();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save period', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (period) => {
    setDeletingItem(period);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/periods/${deletingItem._id}`);
      showToast(`Period '${deletingItem.periodNumber}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchPeriods();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete period');
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
      const res = await api.delete('/admin/periods/bulk', { ids: selectedIds });
      showToast(res.message || `${res.data?.deletedCount || selectedIds.length} periods deleted successfully`, 'success');
      if (res.data?.blockedCount > 0) {
        setSelectedIds(res.data.blockedItems.map((b) => b.id));
      } else {
        setSelectedIds([]);
      }
      setIsBulkDialogOpen(false);
      fetchPeriods();
    } catch (err) {
      const msg = err.message || 'Failed to delete selected periods';
      setBulkDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Period Slot',
      accessor: 'periodNumber',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="code-badge font-mono font-semibold">{row.periodNumber}</span>
          <span className="font-semibold text-primary">{row.label || `${row.periodNumber} (${row.startTime} - ${row.endTime})`}</span>
        </div>
      )
    },
    {
      header: 'Start Time (12h)',
      accessor: 'startTime',
      render: (row) => <span className="font-medium">{row.startTime}</span>
    },
    {
      header: 'End Time (12h)',
      accessor: 'endTime',
      render: (row) => <span className="font-medium">{row.endTime}</span>
    },
    {
      header: 'Daily Sequence',
      accessor: 'order',
      render: (row) => <span>Slot #{row.order}</span>
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
          <h1 className="page-title">Periods & Timings Management</h1>
          <p className="page-subtitle">
            Configure standardized academic lecture period intervals (12-hour format) for department timetables.
          </p>
        </div>
      </div>

      <DataTable
        title="Configured Period Intervals"
        subtitle="Standardized 12-hour academic lecture slots"
        data={periods}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading period intervals..."
        selectable
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleOpenBulkDelete}
        isBulkDeleting={isBulkDeleting}
        bulkDeleteLabel="Delete Selected Periods"
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
        addLabel="Add Period Slot"
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No period intervals configured yet"
        emptyDescription="Define academic periods like P1 (9:00 AM - 9:50 AM), P2 (10:00 AM - 10:50 AM)."
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Period Slot' : 'Create Period Slot'}
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="period-number" className="form-label">
              Period Slot Number (e.g. P1, P2) <span className="required">*</span>
            </label>
            <input
              id="period-number"
              type="text"
              className={`form-input uppercase ${formErrors.periodNumber ? 'error' : ''}`}
              placeholder="e.g. P1, P2, P3"
              value={formData.periodNumber}
              onChange={(e) => setFormData({ ...formData, periodNumber: e.target.value.toUpperCase() })}
              required
            />
            {formErrors.periodNumber && (
              <span className="form-error-msg">{formErrors.periodNumber}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="period-start" className="form-label">
                Start Time (12-hour) <span className="required">*</span>
              </label>
              <input
                id="period-start"
                type="text"
                className={`form-input ${formErrors.startTime ? 'error' : ''}`}
                placeholder="e.g. 9:00 AM"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
              />
              {formErrors.startTime && (
                <span className="form-error-msg">{formErrors.startTime}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="period-end" className="form-label">
                End Time (12-hour) <span className="required">*</span>
              </label>
              <input
                id="period-end"
                type="text"
                className={`form-input ${formErrors.endTime ? 'error' : ''}`}
                placeholder="e.g. 9:50 AM"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
              />
              {formErrors.endTime && (
                <span className="form-error-msg">{formErrors.endTime}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="period-order" className="form-label">
              Daily Sequence Index <span className="required">*</span>
            </label>
            <input
              id="period-order"
              type="number"
              min="1"
              max="20"
              className="form-input"
              value={formData.order}
              onChange={(e) => setFormData({ ...formData, order: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="period-status" className="form-label">
              Status <span className="required">*</span>
            </label>
            <select
              id="period-status"
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
              id="btn-save-period"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Period Slot'
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
        title="Delete Period Interval"
        itemName={deletingItem ? `${deletingItem.periodNumber} (${deletingItem.startTime} - ${deletingItem.endTime})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Period Intervals"
        itemName={`${selectedIds.length} selected period intervals`}
        isDeleting={isBulkDeleting}
        error={bulkDeleteError}
      />
    </div>
  );
};

export default PeriodsPage;
