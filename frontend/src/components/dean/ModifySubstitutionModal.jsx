import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';
import { useToast } from '../../context/ToastContext';
import { formatAcademicSection } from '../../utils/academicFormatter';

export const ModifySubstitutionModal = ({ substitution, isOpen, onClose, onSuccess }) => {
  const { showToast } = useToast();

  const [availableFaculty, setAvailableFaculty] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [labs, setLabs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [sections, setSections] = useState([]);

  const [selectedSubstituteId, setSelectedSubstituteId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('CONFIRMED');
  const [reason, setReason] = useState('');

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [conflictError, setConflictError] = useState(null);

  useEffect(() => {
    if (!isOpen || !substitution) return;

    setSelectedSubstituteId(substitution.substituteFaculty?._id || substitution.substituteFaculty || '');
    setSelectedSubjectId(substitution.subject?._id || substitution.subject || '');
    setSelectedSectionId(substitution.section?._id || substitution.section || '');
    setSelectedRoomId(substitution.roomId || substitution.roomDetails?.roomId || '');
    setSelectedStatus(substitution.status || 'CONFIRMED');
    setReason(substitution.reason || '');
    setConflictError(null);

    const loadOptions = async () => {
      setLoadingOptions(true);
      try {
        const periodId = substitution.period?._id || substitution.period;
        const day = substitution.day;

        const [substitutesRes, classroomsRes, labsRes, subjectsRes, sectionsRes] = await Promise.all([
          deanApi.getAvailableSubstitutes({ day, periodId }),
          deanApi.getClassroomList(),
          deanApi.getLabList(),
          deanApi.getSubjectList(),
          deanApi.getSectionList()
        ]);

        // Include current substitute in the dropdown if not already in available list
        let subsList = substitutesRes.data || [];
        const currentSubId = substitution.substituteFaculty?._id || substitution.substituteFaculty;
        if (currentSubId && !subsList.some((f) => f._id.toString() === currentSubId.toString())) {
          subsList = [
            {
              _id: currentSubId,
              fullName: substitution.substituteFaculty?.fullName || 'Current Substitute',
              facultyId: substitution.substituteFaculty?.facultyId || '',
              designation: substitution.substituteFaculty?.designation || ''
            },
            ...subsList
          ];
        }

        setAvailableFaculty(subsList);
        setClassrooms(classroomsRes.data || []);
        setLabs(labsRes.data || []);
        setSubjects(subjectsRes.data || []);
        setSections(sectionsRes.data || []);
      } catch (err) {
        console.error('Failed to load substitution options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadOptions();
  }, [isOpen, substitution]);

  if (!isOpen || !substitution) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setConflictError(null);

    try {
      // Find room details from classrooms or labs
      let roomType = substitution.roomType || 'Classroom';
      let roomDetails = substitution.roomDetails;

      const chosenClassroom = classrooms.find((c) => c._id.toString() === selectedRoomId);
      const chosenLab = labs.find((l) => l._id.toString() === selectedRoomId);

      if (chosenClassroom) {
        roomType = 'Classroom';
        roomDetails = {
          roomNumber: chosenClassroom.roomNumber,
          name: `Classroom ${chosenClassroom.roomNumber}`,
          capacity: chosenClassroom.capacity
        };
      } else if (chosenLab) {
        roomType = 'Lab';
        roomDetails = {
          roomNumber: chosenLab.labNumber,
          name: chosenLab.labName || `Lab ${chosenLab.labNumber}`,
          capacity: chosenLab.capacity
        };
      }

      const payload = {
        substituteFacultyId: selectedSubstituteId,
        subjectId: selectedSubjectId,
        sectionId: selectedSectionId,
        roomId: selectedRoomId,
        roomType,
        roomDetails,
        status: selectedStatus,
        reason: reason.trim()
      };

      await deanApi.modifySubstitution(substitution._id, payload);

      showToast('Substitution updated successfully.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err.message || 'Unable to update substitution. Conflict detected.';
      setConflictError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const periodLabel = substitution.period?.periodNumber || 'Period';
  const timeFormatted = `${substitution.period?.startTime || ''} - ${substitution.period?.endTime || ''}`;

  return (
    <div className="dp-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="dp-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="dp-modal-header">
          <div>
            <h3 className="dp-modal-title">Modify Substitution</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--dp-secondary)', margin: '2px 0 0 0' }}>
              Computer Science Department
            </p>
          </div>
          <button type="button" className="dp-drawer-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="dp-modal-body">
            {/* Target Schedule Info Box */}
            <div
              style={{
                background: 'var(--dp-surface)',
                border: '1px solid var(--dp-border)',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '8px'
              }}
            >
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Date</span>
                <strong style={{ fontSize: '0.84rem', color: 'var(--dp-text)' }}>{substitution.date} ({substitution.day})</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Period</span>
                <strong style={{ fontSize: '0.84rem', color: 'var(--dp-text)' }}>{periodLabel}</strong>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Time</span>
                <span style={{ fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--dp-secondary)', fontWeight: 600 }}>{timeFormatted}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Class</span>
                <strong style={{ fontSize: '0.84rem', color: 'var(--dp-text)' }}>{formatAcademicSection(substitution.section?.name, substitution.section?.semester?.name)}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--dp-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Original Faculty</span>
                <strong style={{ fontSize: '0.84rem', color: 'var(--dp-text)' }}>{substitution.originalFaculty?.fullName}</strong>
              </div>
            </div>

            {/* Conflict Alert Banner if any */}
            {conflictError && (
              <div className="dp-form-alert error" role="alert">
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Scheduling Conflict:</strong>
                  <div style={{ marginTop: '2px' }}>{conflictError}</div>
                </div>
              </div>
            )}

            {loadingOptions ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--dp-secondary)' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto', color: 'var(--dp-primary)' }} />
                <span>Checking available faculty and rooms...</span>
              </div>
            ) : (
              <>
                {/* 1. Substitute Faculty Select */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="select-substitute-faculty">
                    Substitute Faculty
                  </label>
                  <select
                    id="select-substitute-faculty"
                    className="dp-form-select"
                    value={selectedSubstituteId}
                    onChange={(e) => setSelectedSubstituteId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Substitute Faculty --</option>
                    {availableFaculty.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.fullName} ({f.facultyId}) — {f.designation || 'Faculty'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Room Select */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="select-room">
                    Room
                  </label>
                  <select
                    id="select-room"
                    className="dp-form-select"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    required
                  >
                    <optgroup label="Classrooms">
                      {classrooms.map((c) => (
                        <option key={c._id} value={c._id}>
                          Classroom {c.roomNumber} (Cap: {c.capacity})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Labs">
                      {labs.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.labNumber} — {l.labName} (Cap: {l.capacity})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>

                {/* 3. Subject Select (Optional adjustment) */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="select-subject">
                    Subject
                  </label>
                  <select
                    id="select-subject"
                    className="dp-form-select"
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Section Select */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="select-section">
                    Class
                  </label>
                  <select
                    id="select-section"
                    className="dp-form-select"
                    value={selectedSectionId}
                    onChange={(e) => setSelectedSectionId(e.target.value)}
                  >
                    {sections.map((sec) => (
                      <option key={sec._id} value={sec._id}>
                        {formatAcademicSection(sec.name, sec.semester?.name)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 5. Status Select */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="select-status">
                    Status
                  </label>
                  <select
                    id="select-status"
                    className="dp-form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                  >
                    <option value="CONFIRMED">ACTIVE</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>

                {/* 6. Reason */}
                <div className="dp-form-group">
                  <label className="dp-form-label" htmlFor="input-reason">
                    Reason / Notes
                  </label>
                  <textarea
                    id="input-reason"
                    className="dp-form-textarea"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Approved and rescheduled by Dean Office"
                  />
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="dp-modal-footer">
            <button type="button" className="dp-btn dp-btn-outline" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="dp-btn dp-btn-primary" disabled={submitting || loadingOptions}>
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Validating & Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModifySubstitutionModal;
