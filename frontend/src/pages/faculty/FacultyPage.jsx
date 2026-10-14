import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/client';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import {
  User,
  Mail,
  Phone,
  Shield,
  Send,
  Calendar,
  Layers,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  Eye,
  KeyRound
} from 'lucide-react';

export const FacultyPage = () => {
  const [facultyList, setFacultyList] = useState([]);
  const [subjectsList, setSubjectsList] = useState([]);
  const [sectionsList, setSectionsList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Create / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    personalEmail: '',
    facultyId: '',
    phone: '',
    designation: 'Assistant Professor',
    department: 'Computer Science',
    assignedSubjects: [],
    assignedSections: [],
    status: 'ACTIVE'
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View Details Modal state
  const [viewingFaculty, setViewingFaculty] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Delete / Deactivate states
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

  const loadDropdowns = async () => {
    try {
      const [subsRes, secsRes] = await Promise.all([
        api.get('/admin/subjects'),
        api.get('/admin/class-sections')
      ]);
      if (subsRes && subsRes.data) setSubjectsList(subsRes.data);
      if (secsRes && secsRes.data) setSectionsList(secsRes.data);
    } catch (err) {
      console.error('Failed to load subjects or sections:', err);
    }
  };

  const fetchFaculty = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/admin/faculty', params);
      if (res && res.data) {
        setFacultyList(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load faculty', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, showToast]);

  useEffect(() => {
    loadDropdowns();
  }, []);

  useEffect(() => {
    fetchFaculty();
  }, [fetchFaculty]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      fullName: '',
      personalEmail: '',
      facultyId: '',
      phone: '',
      designation: 'Assistant Professor',
      department: 'Computer Science',
      assignedSubjects: [],
      assignedSections: [],
      status: 'ACTIVE'
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (faculty) => {
    setEditingItem(faculty);
    setFormData({
      fullName: faculty.fullName,
      personalEmail: faculty.personalEmail,
      facultyId: faculty.facultyId,
      phone: faculty.phone,
      designation: faculty.designation,
      department: faculty.department || 'Computer Science',
      assignedSubjects: (faculty.assignedSubjects || []).map((s) => s._id || s),
      assignedSections: (faculty.assignedSections || []).map((sec) => sec._id || sec),
      status: faculty.status
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleViewDetails = async (faculty) => {
    setIsViewModalOpen(true);
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/admin/faculty/${faculty._id}`);
      if (res && res.data) {
        setViewingFaculty(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch faculty details', 'error');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleResendCredentials = async (facultyId) => {
    setIsResending(true);
    try {
      const res = await api.post(`/admin/faculty/${facultyId}/resend-credentials`, {});
      showToast(res.message || 'Credentials resent successfully', 'success');
      // Refresh current viewing record
      if (viewingFaculty && viewingFaculty._id === facultyId) {
        setViewingFaculty((prev) => ({
          ...prev,
          emailDeliveryStatus: 'SENT',
          lastEmailSentAt: new Date().toISOString()
        }));
      }
      fetchFaculty();
    } catch (err) {
      showToast(err.message || 'Failed to resend credentials', 'error');
    } finally {
      setIsResending(false);
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Full name is required';
    if (!formData.personalEmail.trim()) {
      errs.personalEmail = 'Personal email is required for credential delivery';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.personalEmail.trim())) {
      errs.personalEmail = 'Please provide a valid personal email';
    }
    if (!formData.facultyId.trim()) errs.facultyId = 'Faculty ID is required (e.g. FAC001)';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    if (!formData.designation.trim()) errs.designation = 'Designation is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (editingItem) {
        await api.put(`/admin/faculty/${editingItem._id}`, formData);
        showToast(`Faculty '${formData.fullName}' updated successfully`, 'success');
      } else {
        const res = await api.post('/admin/faculty', formData);
        showToast(
          res.message || `Faculty created! Credentials generated and sent to ${formData.personalEmail}`,
          'success'
        );
      }
      setIsModalOpen(false);
      fetchFaculty();
    } catch (err) {
      setFormErrors({ submit: err.message });
      showToast(err.message || 'Failed to save faculty record', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (faculty) => {
    setDeletingItem(faculty);
    setDeleteError(null);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/admin/faculty/${deletingItem._id}`);
      showToast(`Faculty member '${deletingItem.fullName}' deleted successfully`, 'success');
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
      fetchFaculty();
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete faculty member');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleSubjectAssignment = (subId) => {
    const current = formData.assignedSubjects || [];
    if (current.includes(subId)) {
      setFormData({ ...formData, assignedSubjects: current.filter((id) => id !== subId) });
    } else {
      setFormData({ ...formData, assignedSubjects: [...current, subId] });
    }
  };

  const toggleSectionAssignment = (secId) => {
    const current = formData.assignedSections || [];
    if (current.includes(secId)) {
      setFormData({ ...formData, assignedSections: current.filter((id) => id !== secId) });
    } else {
      setFormData({ ...formData, assignedSections: [...current, secId] });
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
      const res = await api.delete('/admin/faculty/bulk', { ids: selectedIds });
      showToast(res.message || `${res.data?.deletedCount || selectedIds.length} faculty members deleted successfully`, 'success');
      if (res.data?.blockedCount > 0) {
        setSelectedIds(res.data.blockedItems.map((b) => b.id));
      } else {
        setSelectedIds([]);
      }
      setIsBulkDialogOpen(false);
      fetchFaculty();
    } catch (err) {
      const msg = err.message || 'Failed to delete selected faculty members';
      setBulkDeleteError(msg);
      showToast(msg, 'error');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Faculty Member',
      accessor: 'fullName',
      render: (row) => (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span className="font-semibold text-primary">{row.fullName}</span>
          <span className="text-muted text-sm">{row.designation}</span>
        </div>
      )
    },
    {
      header: 'Faculty ID',
      accessor: 'facultyId',
      render: (row) => <span className="code-badge font-mono">{row.facultyId}</span>
    },
    {
      header: 'Official Email',
      accessor: 'officialEmail',
      render: (row) => (
        <span className="font-mono text-sm" style={{ color: 'var(--primary-main)' }}>
          {row.officialEmail}
        </span>
      )
    },
    {
      header: 'Personal Email',
      accessor: 'personalEmail',
      render: (row) => <span className="text-secondary text-sm">{row.personalEmail}</span>
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
          <h1 className="page-title">Faculty Management</h1>
          <p className="page-subtitle">
            Manage Computer Science faculty profiles, credentials, academic subject assignments, and schedules.
          </p>
        </div>
      </div>

      <DataTable
        title="Department Faculty"
        subtitle="Active educators and departmental instructors"
        data={facultyList}
        columns={columns}
        isLoading={isLoading}
        loadingMessage="Loading faculty records..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by faculty name, ID, or official email..."
        selectable
        selectedIds={selectedIds}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        onClearSelection={handleClearSelection}
        onBulkDelete={handleOpenBulkDelete}
        isBulkDeleting={isBulkDeleting}
        bulkDeleteLabel="Delete Selected Faculty"
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
        addLabel="Add Faculty"
        onViewClick={handleViewDetails}
        onEditClick={handleOpenEdit}
        onDeleteClick={handleOpenDelete}
        emptyTitle="No faculty members registered yet"
        emptyDescription="Create faculty accounts to generate @campussynq.com credentials and assign lectures."
      />

      {/* Row Custom Action: View Details button (Rendered alongside table actions via custom list click) */}
      <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        * Tip: Click on any faculty member in the list to view full academic profile and timetable schedule.
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Faculty Member' : 'Register New Faculty Member'}
        maxWidth="620px"
      >
        <form onSubmit={handleSubmit} noValidate>
          {formErrors.submit && (
            <div className="alert-box alert-error" role="alert">
              <span>{formErrors.submit}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="faculty-fullname" className="form-label">
                Full Name <span className="required">*</span>
              </label>
              <input
                id="faculty-fullname"
                type="text"
                className={`form-input ${formErrors.fullName ? 'error' : ''}`}
                placeholder="e.g. Dr. Stephen Hawking"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
              {formErrors.fullName && <span className="form-error-msg">{formErrors.fullName}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="faculty-id" className="form-label">
                Faculty / Employee ID <span className="required">*</span>
              </label>
              <input
                id="faculty-id"
                type="text"
                className={`form-input uppercase ${formErrors.facultyId ? 'error' : ''}`}
                placeholder="e.g. FAC001, CS-FAC-10"
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value.toUpperCase() })}
                required
              />
              {formErrors.facultyId && <span className="form-error-msg">{formErrors.facultyId}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="faculty-personal-email" className="form-label">
                Personal Email (For Credentials) <span className="required">*</span>
              </label>
              <input
                id="faculty-personal-email"
                type="email"
                className={`form-input ${formErrors.personalEmail ? 'error' : ''}`}
                placeholder="teacher@gmail.com"
                value={formData.personalEmail}
                onChange={(e) => setFormData({ ...formData, personalEmail: e.target.value })}
                required
              />
              {formErrors.personalEmail && (
                <span className="form-error-msg">{formErrors.personalEmail}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="faculty-phone" className="form-label">
                Contact Phone <span className="required">*</span>
              </label>
              <input
                id="faculty-phone"
                type="text"
                className={`form-input ${formErrors.phone ? 'error' : ''}`}
                placeholder="+1 555-0199"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
              {formErrors.phone && <span className="form-error-msg">{formErrors.phone}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="faculty-designation" className="form-label">
                Designation <span className="required">*</span>
              </label>
              <select
                id="faculty-designation"
                className="form-select"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              >
                <option value="Professor">Professor</option>
                <option value="Associate Professor">Associate Professor</option>
                <option value="Assistant Professor">Assistant Professor</option>
                <option value="Senior Lecturer">Senior Lecturer</option>
                <option value="Lecturer">Lecturer</option>
                <option value="HOD">Head of Department (HOD)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="faculty-department" className="form-label">
                Department
              </label>
              <input
                id="faculty-department"
                type="text"
                className="form-input"
                value={formData.department}
                disabled
              />
            </div>
          </div>

          {!editingItem && (
            <div className="alert-box" style={{ background: 'var(--primary-light)', border: '1px solid var(--primary-300)', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                <KeyRound size={18} style={{ color: 'var(--primary-main)', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ fontSize: '0.825rem', lineHeight: '1.45' }}>
                  <strong>Automated Credential Generation:</strong>
                  <p style={{ margin: '4px 0 0' }}>
                    An official <code>@campussynq.com</code> address and temporary password (<code>password@123</code>) will be generated and dispatched securely to the personal email above.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Academic Allocation Section */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Academic Subject Allocation
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '110px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
              {subjectsList.length === 0 ? (
                <span className="text-muted text-sm">No subjects registered yet.</span>
              ) : (
                subjectsList.map((sub) => {
                  const isChecked = (formData.assignedSubjects || []).includes(sub._id);
                  return (
                    <button
                      key={sub._id}
                      type="button"
                      className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleSubjectAssignment(sub._id)}
                    >
                      {sub.code} - {sub.name}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4 style={{ fontSize: '0.875rem', fontWeight: '700', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Assigned Class Sections
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '100px', overflowY: 'auto', padding: '0.5rem', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)' }}>
              {sectionsList.length === 0 ? (
                <span className="text-muted text-sm">No class sections registered yet.</span>
              ) : (
                sectionsList.map((sec) => {
                  const isChecked = (formData.assignedSections || []).includes(sec._id);
                  return (
                    <button
                      key={sec._id}
                      type="button"
                      className={`btn btn-sm ${isChecked ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => toggleSectionAssignment(sec._id)}
                    >
                      {sec.name} ({sec.semester?.name || 'Semester'})
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label htmlFor="faculty-status" className="form-label">
              Account Status <span className="required">*</span>
            </label>
            <select
              id="faculty-status"
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
              id="btn-save-faculty"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  <span>Saving & Dispatching...</span>
                </>
              ) : editingItem ? (
                'Save Changes'
              ) : (
                'Create Faculty & Dispatch'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW DETAILS & TIMETABLE MODAL */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Faculty Academic Profile & Schedule"
        maxWidth="680px"
      >
        {isLoadingDetails || !viewingFaculty ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Loader2 className="spinner" size={24} style={{ color: 'var(--primary-main)', margin: '0 auto 0.75rem' }} />
            <p className="text-secondary text-sm">Loading faculty academic profile...</p>
          </div>
        ) : (
          <div>
            {/* Header info */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{viewingFaculty.fullName}</h3>
                <span className="code-badge font-mono" style={{ marginTop: '4px', display: 'inline-block' }}>
                  {viewingFaculty.facultyId}
                </span>
                <span style={{ marginLeft: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {viewingFaculty.designation} • {viewingFaculty.department}
                </span>
              </div>
              <Badge status={viewingFaculty.status} />
            </div>

            {/* Credential overview card */}
            <div className="card" style={{ padding: '1rem', background: 'var(--bg-surface-secondary)', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--primary-main)' }}>
                  Institutional Credentials
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleResendCredentials(viewingFaculty._id)}
                  disabled={isResending}
                  id="btn-resend-credentials"
                >
                  <Send size={13} className={isResending ? 'spinner' : ''} />
                  <span>{isResending ? 'Sending...' : 'Resend Credentials'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>Official Login Email:</span>
                  <span className="font-mono font-semibold" style={{ color: 'var(--primary-main)' }}>{viewingFaculty.officialEmail}</span>
                </div>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>Personal Delivery Email:</span>
                  <span className="font-mono">{viewingFaculty.personalEmail}</span>
                </div>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>Phone Contact:</span>
                  <span>{viewingFaculty.phone}</span>
                </div>
                <div>
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.75rem' }}>Credential Dispatch Status:</span>
                  <span style={{ fontWeight: '600', color: viewingFaculty.emailDeliveryStatus === 'SENT' ? 'var(--success)' : 'var(--warning)' }}>
                    {viewingFaculty.emailDeliveryStatus || 'PENDING'}
                  </span>
                </div>
              </div>
            </div>

            {/* Assigned Subjects & Sections */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Allocated Subjects
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(!viewingFaculty.assignedSubjects || viewingFaculty.assignedSubjects.length === 0) ? (
                  <span className="text-muted text-sm">No subjects currently allocated.</span>
                ) : (
                  viewingFaculty.assignedSubjects.map((sub) => (
                    <span key={sub._id} className="badge badge-active" style={{ textTransform: 'none', fontSize: '0.8rem' }}>
                      <BookOpen size={12} /> {sub.code}: {sub.name}
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Weekly Timetable Sessions */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: '700', marginBottom: '0.5rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                Active Timetable Sessions ({viewingFaculty.timetable ? viewingFaculty.timetable.length : 0})
              </h4>
              {(!viewingFaculty.timetable || viewingFaculty.timetable.length === 0) ? (
                <div style={{ padding: '1rem', background: 'var(--bg-surface-secondary)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <p className="text-muted text-sm">No lectures scheduled in the master timetable yet.</p>
                </div>
              ) : (
                <div className="table-responsive-wrapper" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '0.825rem' }}>
                    <thead>
                      <tr>
                        <th>Day</th>
                        <th>Period</th>
                        <th>Subject</th>
                        <th>Class Section</th>
                        <th>Allocated Room</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingFaculty.timetable.map((session) => (
                        <tr key={session._id}>
                          <td className="font-semibold">{session.day}</td>
                          <td>
                            <span className="code-badge">{session.period?.periodNumber || 'Slot'}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                              ({session.period?.startTime} - {session.period?.endTime})
                            </span>
                          </td>
                          <td className="font-medium">{session.subject?.name}</td>
                          <td>{session.section?.name}</td>
                          <td>
                            <span className="badge badge-active">{session.roomDetails?.roomNumber}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleOpenEdit(viewingFaculty);
                }}
              >
                Edit Allocations
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete / Deactivate Confirmation Modal */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Faculty Member"
        itemName={deletingItem ? `${deletingItem.fullName} (${deletingItem.facultyId})` : ''}
        isDeleting={isDeleting}
        error={deleteError}
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={isBulkDialogOpen}
        onClose={() => setIsBulkDialogOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Faculty Members"
        itemName={`${selectedIds.length} selected faculty members`}
        isDeleting={isBulkDeleting}
        error={bulkDeleteError}
      />
    </div>
  );
};

export default FacultyPage;
