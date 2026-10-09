import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, BookOpen, Users, MapPin, AlertCircle, CheckCircle, ArrowRightLeft, Loader2 } from 'lucide-react';
import facultyApi from '../../api/facultyApi';
import { useToast } from '../../context/ToastContext';

export const SubstitutionModal = ({ isOpen, onClose, session, onSuccess }) => {
  const { showToast } = useToast();
  const [substitutes, setSubstitutes] = useState([]);
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('');
  const [reason, setReason] = useState('');
  const [substitutionDate, setSubstitutionDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [isLoadingSubstitutes, setIsLoadingSubstitutes] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !session) return;

    setErrorMessage('');
    setSelectedSubstituteId(session.substituteFaculty?._id || '');
    setReason(session.substitutionReason || '');

    const fetchSubstitutes = async () => {
      setIsLoadingSubstitutes(true);
      try {
        const periodId = session.period?._id || session.period;
        const res = await facultyApi.getAvailableSubstitutes(session.day, periodId);
        if (res && res.data) {
          setSubstitutes(res.data);
        }
      } catch (err) {
        console.error('Failed to load substitutes:', err);
        setErrorMessage('Unable to load available faculty members.');
      } finally {
        setIsLoadingSubstitutes(false);
      }
    };

    fetchSubstitutes();
  }, [isOpen, session]);

  if (!isOpen || !session) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedSubstituteId) {
      setErrorMessage('Please select a substitute faculty member.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        timetableEntryId: session._id,
        substituteFacultyId: selectedSubstituteId,
        reason: reason.trim() || 'Faculty class substitution request',
        date: substitutionDate
      };

      const res = await facultyApi.requestSubstitution(payload);
      showToast('Substitution updated successfully.', 'success');
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      const msg = err.message || 'Unable to update substitution. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const periodLabel = session.period?.periodNumber || 'Period';
  const periodTime = session.period?.startTime && session.period?.endTime
    ? `${session.period.startTime} - ${session.period.endTime}`
    : 'Scheduled time';

  return (
    <div
      className="fp-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-sub-title"
    >
      <div className="fp-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fp-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--fp-primary-soft)',
                color: 'var(--fp-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowRightLeft size={18} />
            </div>
            <div>
              <h3 id="modal-sub-title" style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--fp-text)' }}>
                {session.isSubstituted ? 'Update Substitution' : 'Request Substitution'}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--fp-secondary)', margin: '2px 0 0 0' }}>
                Delegate this academic period to an available colleague
              </p>
            </div>
          </div>
          <button
            type="button"
            className="fp-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Current Session Summary */}
        <div className="fp-modal-session-summary">
          <div className="fp-modal-summary-item">
            <span>Subject</span>
            <span>{session.subject?.name || 'Subject'} ({session.subject?.code || ''})</span>
          </div>

          <div className="fp-modal-summary-item">
            <span>Section & Room</span>
            <span>{session.section?.name || 'Section'} • Room {session.roomDetails?.roomNumber || 'Room'}</span>
          </div>

          <div className="fp-modal-summary-item">
            <span>Period & Time</span>
            <span>{periodLabel} ({periodTime})</span>
          </div>

          <div className="fp-modal-summary-item">
            <span>Current Faculty</span>
            <span>{session.faculty?.fullName || 'You'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--fp-danger-soft)',
              color: 'var(--fp-danger)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            role="alert"
          >
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="fp-form-group">
            <label htmlFor="substitute-faculty" className="fp-form-label">
              Substitute Faculty <span style={{ color: 'var(--fp-danger)' }}>*</span>
            </label>
            {isLoadingSubstitutes ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--fp-secondary)', padding: '8px 0' }}>
                <Loader2 size={16} className="spinner" />
                <span>Checking faculty availability in {session.day}...</span>
              </div>
            ) : (
              <select
                id="substitute-faculty"
                className="fp-form-select"
                value={selectedSubstituteId}
                onChange={(e) => setSelectedSubstituteId(e.target.value)}
                disabled={isSubmitting}
                required
              >
                <option value="">-- Choose substitute faculty --</option>
                {substitutes.map((fac) => (
                  <option
                    key={fac._id}
                    value={fac._id}
                    disabled={!fac.isAvailable}
                  >
                    {fac.fullName} ({fac.designation || 'Faculty'}) {fac.isAvailable ? '✓ Available' : '⚠ Busy during this period'}
                  </option>
                ))}
              </select>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--fp-secondary)' }}>
              Only faculty members without a scheduling conflict during {periodLabel} ({periodTime}) are available.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="fp-form-group">
              <label htmlFor="sub-date" className="fp-form-label">
                Effective Date <span style={{ color: 'var(--fp-danger)' }}>*</span>
              </label>
              <input
                id="sub-date"
                type="date"
                className="fp-form-input"
                value={substitutionDate}
                onChange={(e) => setSubstitutionDate(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="fp-form-group">
              <label htmlFor="sub-time-disp" className="fp-form-label">
                Period Slot
              </label>
              <input
                id="sub-time-disp"
                type="text"
                className="fp-form-input"
                value={`${periodLabel}: ${periodTime}`}
                disabled
                readOnly
                style={{ opacity: 0.7 }}
              />
            </div>
          </div>

          <div className="fp-form-group">
            <label htmlFor="sub-reason" className="fp-form-label">
              Reason for Substitution <span style={{ fontWeight: 400, color: 'var(--fp-secondary)' }}>(Optional)</span>
            </label>
            <textarea
              id="sub-reason"
              rows={2}
              className="fp-form-textarea"
              placeholder="e.g. Attending departmental curriculum review, university seminar, or medical leave"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {/* Modal Actions */}
          <div className="fp-modal-actions">
            <button
              type="button"
              className="fp-btn-outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="fp-btn-primary"
              disabled={isSubmitting || isLoadingSubstitutes}
              id="btn-confirm-substitution"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={15} />
                  <span>{session.isSubstituted ? 'Update Substitution' : 'Assign Substitution'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubstitutionModal;
