import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Calendar, Filter, Clock, MapPin, Users, BookOpen, Loader2 } from 'lucide-react';
import deanApi from '../../api/dean';
import { formatAcademicSection, formatAcademicStatus } from '../../utils/academicFormatter';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';

export const DeanTimetablePage = () => {
  const { openEntityDrawer } = useOutletContext() || {};

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableEntries, setTimetableEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');

  // Initial load of master filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [semRes, secRes, facRes] = await Promise.all([
          deanApi.getSemesterList(),
          deanApi.getSectionList(),
          deanApi.getFacultyList()
        ]);
        setSemesters(semRes.data || []);
        setSections(secRes.data || []);
        setFacultyList(facRes.data || []);
      } catch (err) {
        console.error('Failed to load timetable filters:', err);
      }
    };
    loadFilters();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const params = { day: selectedDay };
      if (selectedSemester) params.semesterId = selectedSemester;
      if (selectedSection) params.sectionId = selectedSection;
      if (selectedFaculty) params.facultyId = selectedFaculty;

      const res = await deanApi.getMasterTimetable(params);
      setTimetableEntries(res.data || []);
    } catch (err) {
      console.error('Failed to load master timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, [selectedDay, selectedSemester, selectedSection, selectedFaculty]);

  // Real-time Event Listener for instant timetable refresh with auto-reconnection and stale data reload
  useRealtimeEvents(() => fetchTimetable(), {
    onReconnect: () => fetchTimetable()
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
            Timetable
          </h1>
          <p style={{ color: 'var(--dp-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Computer Science Department — Weekly Schedule
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="dp-form-select"
            style={{ height: '36px', width: '140px' }}
          >
            <option value="">All Semesters</option>
            {semesters.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>

          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="dp-form-select"
            style={{ height: '36px', width: '130px' }}
          >
            <option value="">All Sections</option>
            {sections.map((sec) => (
              <option key={sec._id} value={sec._id}>{sec.name}</option>
            ))}
          </select>

          <select
            value={selectedFaculty}
            onChange={(e) => setSelectedFaculty(e.target.value)}
            className="dp-form-select"
            style={{ height: '36px', width: '150px' }}
          >
            <option value="">All Faculty</option>
            {facultyList.map((f) => (
              <option key={f._id} value={f._id}>{f.fullName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Day Selector Tabs */}
      <div className="dp-filter-tabs">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            className={`dp-filter-tab-btn ${selectedDay === day ? 'active' : ''}`}
            onClick={() => setSelectedDay(day)}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Timetable Matrix */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Loading timetable for {selectedDay}...</span>
        </div>
      ) : timetableEntries.length === 0 ? (
        <div className="dp-empty-state" style={{ background: 'var(--dp-card)', borderRadius: 'var(--dp-radius-md)', border: '1px solid var(--dp-border)' }}>
          <Calendar size={36} className="dp-empty-icon" />
          <div className="dp-empty-title">No Classes Scheduled</div>
          <div className="dp-empty-desc">
            No classes found for {selectedDay} with the selected filters.
          </div>
        </div>
      ) : (
        <div className="dp-schedule-card">
          <div className="dp-table-container">
            <table className="dp-table">
              <thead>
                <tr>
                  <th>PERIOD</th>
                  <th>TIME</th>
                  <th>SUBJECT</th>
                  <th>FACULTY</th>
                  <th>SECTION</th>
                  <th>ROOM</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {timetableEntries.map((entry) => {
                  const isSubstituted = entry.isSubstituted && entry.substituteFaculty;
                  const time12h = `${entry.period?.startTime || ''} – ${entry.period?.endTime || ''}`;
                  const sessionStatus = isSubstituted ? 'SUBSTITUTED' : (entry.status || 'UPCOMING');

                  return (
                    <tr
                      key={entry._id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (openEntityDrawer) {
                          openEntityDrawer({
                            id: entry.subject?._id,
                            category: 'SUBJECT',
                            title: entry.subject?.name,
                            raw: entry
                          });
                        }
                      }}
                      title="Click to inspect course details"
                    >
                      <td>
                        <span className="dp-period-badge">{entry.period?.periodNumber || 'P1'}</span>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--dp-secondary)' }}>
                          {time12h}
                        </span>
                      </td>
                      <td>
                        <div className="dp-subject-cell">
                          <span style={{ fontWeight: 700, color: 'var(--dp-text)' }}>{entry.subject?.name}</span>
                          {entry.subject?.code && (
                            <span className="dp-code-chip">{entry.subject?.code}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {isSubstituted ? (
                          <div className="dp-faculty-sub-split">
                            <span style={{ color: 'var(--dp-muted)' }}>
                              Original: {entry.originalFaculty?.fullName || entry.faculty?.fullName}
                            </span>
                            <span style={{ color: 'var(--dp-primary)', fontWeight: 600 }}>
                              Substitute: {entry.substituteFaculty?.fullName}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--dp-text)' }}>
                            {entry.faculty?.fullName || '—'}
                          </span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem', color: 'var(--dp-text)', fontWeight: 500 }}>
                          {formatAcademicSection(entry.section?.name, entry.semester?.name)}
                        </span>
                      </td>
                      <td>
                        <div className="dp-room-cell">
                          <span style={{ fontWeight: 700, color: 'var(--dp-text)' }}>
                            {entry.roomDetails?.roomNumber || '—'}
                          </span>
                          <span className="dp-room-type-sub">{entry.roomType || 'Classroom'}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`dp-status-badge ${sessionStatus.toLowerCase().replace(/\s+/g, '-')}`}>
                          {formatAcademicStatus(sessionStatus, 'SESSION')}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeanTimetablePage;
