import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useOutletContext, Link, useSearchParams } from 'react-router-dom';
import {
  Users,
  UserCheck,
  BookOpen,
  DoorOpen,
  Layers,
  Cpu,
  Tv,
  Calendar,
  Clock,
  ArrowRightLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Activity,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ChevronRight,
  Eye,
  Edit2,
  RotateCcw,
  X,
  Filter,
  AlertTriangle
} from 'lucide-react';
import deanApi from '../../api/dean';
import useRealtimeEvents from '../../hooks/useRealtimeEvents';
import { useAuth } from '../../context/AuthContext';
import {
  formatAcademicSection,
  formatAcademicSectionSplit,
  formatAcademicRoom,
  formatTimeRange12h,
  formatAcademicStatus,
  formatAcademicFaculty
} from '../../utils/academicFormatter';
import LiveAcademicStatusModal from '../../components/dean/LiveAcademicStatusModal';

/**
 * Parse 12-hour or 24-hour time string into minutes since midnight for strict chronological sorting
 */
const parse12hToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return 9999;
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3] ? match12[3].toUpperCase() : '';
    if (meridian === 'AM' && hours === 12) hours = 0;
    if (meridian === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  }
  return 9999;
};

/**
 * Determine semantic status badge label and styling class based on actual timetable status
 * and dynamic local time intervals
 */
const getSessionStatusMeta = (item, currentMinutesNow = null) => {
  if (item.isCancelled || item.status === 'CANCELLED') {
    return { label: 'Cancelled', classType: 'cancelled', isLive: false };
  }
  if (item.hasConflict) {
    return { label: 'Conflict', classType: 'conflict', isLive: false };
  }

  // Dynamic time-based evaluation if current time is available
  if (currentMinutesNow !== null && (item.startTime || item.time)) {
    const startM = parse12hToMinutes(item.startTime || (item.time ? item.time.split('-')[0] : ''));
    const endM = parse12hToMinutes(item.endTime || (item.time ? item.time.split('-')[1] : ''));
    if (startM < 9999 && endM < 9999) {
      if (currentMinutesNow >= startM && currentMinutesNow < endM) {
        if (item.isSubstituted) {
          return { label: 'Substituted', classType: 'substituted', isLive: true };
        }
        return { label: 'In Progress', classType: 'live', isLive: true };
      }
      if (currentMinutesNow < startM) {
        return { label: 'Scheduled', classType: 'upcoming', isLive: false };
      }
      if (currentMinutesNow >= endM) {
        return { label: 'Completed', classType: 'completed', isLive: false };
      }
    }
  }

  // Status mapping from backend response
  if (item.status === 'LIVE' || item.status === 'LIVE NOW') {
    return { label: 'In Progress', classType: 'live', isLive: true };
  }
  if (item.isSubstituted) {
    if (item.status === 'COMPLETED') {
      return { label: 'Completed', classType: 'completed', isLive: false };
    }
    return { label: 'Substituted', classType: 'substituted', isLive: false };
  }
  if (item.status === 'UPCOMING' || item.status === 'SCHEDULED') {
    return { label: 'Scheduled', classType: 'upcoming', isLive: false };
  }
  if (item.status === 'COMPLETED') {
    return { label: 'Completed', classType: 'completed', isLive: false };
  }
  const formatted = formatAcademicStatus(item.status, 'SESSION');
  if (formatted === 'LIVE NOW') return { label: 'In Progress', classType: 'live', isLive: true };
  if (formatted === 'UPCOMING') return { label: 'Scheduled', classType: 'upcoming', isLive: false };
  if (formatted === 'COMPLETED') return { label: 'Completed', classType: 'completed', isLive: false };
  return { label: formatted || 'Scheduled', classType: 'upcoming', isLive: false };
};

export const DeanDashboardPage = () => {
  const navigate = useNavigate();
  const { openEntityDrawer, refreshKey } = useOutletContext() || {};
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Dedicated Live Operational Status Modal State
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [liveModalTab, setLiveModalTab] = useState('LIVE_CLASSES');

  const handleOpenLiveModal = (tab = 'LIVE_CLASSES') => {
    setLiveModalTab(tab);
    setIsLiveModalOpen(true);
  };

  const searchBoxRef = useRef(null);

  // Auto-ticking live clock (strictly 12-hour format)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Quick search autocomplete suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await deanApi.getQuickSearch(searchQuery.trim());
        setSuggestions(res.data?.suggestions || []);
      } catch (err) {
        console.error('Quick search suggestions failed:', err);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [searchParams] = useSearchParams();
  const urlSection = searchParams.get('section') || searchParams.get('sectionId') || searchParams.get('class') || '';
  const urlDay = searchParams.get('day') || '';
  const urlDate = searchParams.get('date') || '';
  const urlTime = searchParams.get('time') || '';

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = {};
      if (urlDay) params.day = urlDay;
      if (urlDate) params.date = urlDate;
      if (urlTime) params.time = urlTime;
      const res = await deanApi.getDashboard(params);
      setDashboardData(res.data);
      setError(null);
    } catch (err) {
      console.error('Failed to load Dean dashboard:', err);
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [refreshKey, urlDay, urlDate, urlTime]);

  const handleRealtimeSync = useCallback(() => {
    fetchDashboard();
  }, [urlDay, urlDate, urlTime]);

  // Real-time updates via Server-Sent Events (SSE) with auto-reconnection and stale data reload
  useRealtimeEvents(handleRealtimeSync, {
    endpoint: '/api/v1/dean/events',
    onReconnect: handleRealtimeSync
  });

  // Format 12-hour time without seconds: "10:35 AM"
  const formattedTime12h = currentTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const formattedDate = dashboardData?.currentAcademicContext?.formattedDate || currentTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      navigate(`/dean/current-status?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const liveStats = dashboardData?.liveStats || {};
  const metrics = dashboardData?.metrics || {};
  const currentlyActiveClasses = dashboardData?.currentlyActiveClasses || [];
  const todaySchedule = dashboardData?.todaySchedule || [];

  // Timetable Search and Filter Toolbar State
  const [ttSearchQuery, setTtSearchQuery] = useState('');
  const [ttSubjectFilter, setTtSubjectFilter] = useState('ALL');
  const [ttFacultyFilter, setTtFacultyFilter] = useState('ALL');
  const [ttSectionFilter, setTtSectionFilter] = useState(urlSection || 'ALL');
  const [ttRoomFilter, setTtRoomFilter] = useState('ALL');

  useEffect(() => {
    if (urlSection) {
      setTtSectionFilter(urlSection);
    }
  }, [urlSection]);

  // Master lists for timetable dropdown filters
  const [masterSubjects, setMasterSubjects] = useState([]);
  const [masterFaculty, setMasterFaculty] = useState([]);
  const [masterSections, setMasterSections] = useState([]);
  const [masterRooms, setMasterRooms] = useState([]);

  // Fetch real master records for the dropdown filters
  useEffect(() => {
    let isMounted = true;
    const fetchMasterFilters = async () => {
      try {
        const [subRes, facRes, secRes, classRes, labRes, audRes] = await Promise.allSettled([
          deanApi.getSubjectList(),
          deanApi.getFacultyList(),
          deanApi.getSectionList(),
          deanApi.getClassroomList(),
          deanApi.getLabList(),
          deanApi.getAuditoriumList()
        ]);

        if (!isMounted) return;

        if (subRes.status === 'fulfilled' && subRes.value?.data) {
          const list = Array.isArray(subRes.value.data) ? subRes.value.data : (subRes.value.data.subjects || []);
          setMasterSubjects(list);
        }
        if (facRes.status === 'fulfilled' && facRes.value?.data) {
          const list = Array.isArray(facRes.value.data) ? facRes.value.data : (facRes.value.data.faculty || []);
          setMasterFaculty(list);
        }
        if (secRes.status === 'fulfilled' && secRes.value?.data) {
          const list = Array.isArray(secRes.value.data) ? secRes.value.data : (secRes.value.data.sections || []);
          setMasterSections(list);
        }

        const combinedRooms = [];
        if (classRes.status === 'fulfilled' && classRes.value?.data) {
          const list = Array.isArray(classRes.value.data) ? classRes.value.data : (classRes.value.data.classrooms || []);
          list.forEach(r => combinedRooms.push({ identifier: r.roomNumber || r.name, type: 'Classroom' }));
        }
        if (labRes.status === 'fulfilled' && labRes.value?.data) {
          const list = Array.isArray(labRes.value.data) ? labRes.value.data : (labRes.value.data.labs || []);
          list.forEach(l => combinedRooms.push({ identifier: l.labNumber || l.labName, type: 'Lab' }));
        }
        if (audRes.status === 'fulfilled' && audRes.value?.data) {
          const list = Array.isArray(audRes.value.data) ? audRes.value.data : (audRes.value.data.auditoriums || []);
          list.forEach(a => combinedRooms.push({ identifier: a.auditoriumNumber || a.auditoriumName, type: 'Auditorium' }));
        }
        if (combinedRooms.length > 0) {
          setMasterRooms(combinedRooms);
        }
      } catch (err) {
        console.warn('Failed to load master filters, falling back to schedule data:', err);
      }
    };

    fetchMasterFilters();
    return () => { isMounted = false; };
  }, []);

  // Dropdown options derived from master data + today's timetable
  // Dropdown options derived from master data + today's timetable
  const subjectFilterOptions = useMemo(() => {
    const map = new Map();
    masterSubjects.forEach(s => {
      if (s?._id) {
        const id = String(s._id);
        const label = s.code ? `${s.name} (${s.code})` : s.name;
        map.set(id, { id, name: s.name, code: s.code || '', label });
      } else if (s?.name) {
        const label = s.code ? `${s.name} (${s.code})` : s.name;
        map.set(s.name, { id: s.name, name: s.name, code: s.code || '', label });
      }
    });

    todaySchedule.forEach(item => {
      const id = String(item.subjectId?._id || item.subjectId || '');
      const name = typeof item.subject === 'string' ? item.subject : (item.subject?.name || '');
      const code = item.subjectCode || item.subject?.code || '';
      if (id && !map.has(id)) {
        const label = code ? `${name} (${code})` : name;
        map.set(id, { id, name, code, label });
      } else if (!id && name && !map.has(name)) {
        const label = code ? `${name} (${code})` : name;
        map.set(name, { id: name, name, code, label });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [masterSubjects, todaySchedule]);

  const facultyFilterOptions = useMemo(() => {
    const map = new Map();
    masterFaculty.forEach(f => {
      if (f?._id) {
        const id = String(f._id);
        const label = f.fullName || f.name || 'Faculty';
        map.set(id, { id, name: label, facultyId: f.facultyId || '', label });
      }
    });

    todaySchedule.forEach(item => {
      const id = String(item.facultyDocId || item.faculty?._id || '');
      const name = typeof item.faculty === 'string' ? item.faculty : (item.faculty?.fullName || '');
      if (name && name !== 'Faculty Not Assigned' && name !== 'Not Assigned' && name !== 'Cancelled') {
        if (id && !map.has(id)) {
          map.set(id, { id, name, facultyId: item.facultyId || '', label: name });
        } else if (!id && !map.has(name)) {
          map.set(name, { id: name, name, facultyId: item.facultyId || '', label: name });
        }
      }
      if (item.substituteFaculty && !map.has(item.substituteFaculty)) {
        map.set(item.substituteFaculty, { id: item.substituteFaculty, name: item.substituteFaculty, label: item.substituteFaculty });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [masterFaculty, todaySchedule]);

  const sectionFilterOptions = useMemo(() => {
    const map = new Map();
    // 1. Populate from actual class section records with stable database IDs
    masterSections.forEach(s => {
      if (s?._id) {
        const id = String(s._id);
        const semName = s.semester?.name || '';
        const label = semName ? `${s.name} (${semName})` : s.name;
        map.set(id, {
          id,
          name: s.name,
          label,
          semester: semName
        });
      }
    });

    // 2. Also ensure any section in today's schedule is present
    todaySchedule.forEach(item => {
      const id = String(item.sectionId?._id || item.sectionId || '');
      const name = typeof item.section === 'string' ? item.section : (item.section?.name || '');
      if (id && !map.has(id)) {
        const semName = item.semester || '';
        const label = semName ? `${name} (${semName})` : name;
        map.set(id, { id, name, label, semester: semName });
      } else if (!id && name && !map.has(name)) {
        map.set(name, { id: name, name, label: name, semester: '' });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [masterSections, todaySchedule]);

  const roomFilterOptions = useMemo(() => {
    const map = new Map();
    masterRooms.forEach(r => {
      const identifier = r.identifier || r.roomNumber || r.name;
      if (identifier) {
        const type = r.type || 'Room';
        const label = `${identifier} (${type})`;
        map.set(identifier, { id: identifier, identifier, label, type });
      }
    });

    todaySchedule.forEach(item => {
      const identifier = item.room || item.roomDetails?.roomNumber;
      if (identifier && identifier !== 'Unassigned' && !map.has(identifier)) {
        const type = item.roomType || 'Venue';
        const label = `${identifier} (${type})`;
        map.set(identifier, { id: identifier, identifier, label, type });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.identifier.localeCompare(b.identifier));
  }, [masterRooms, todaySchedule]);

  // Deduplicate identical sessions while preserving legitimate separate sessions
  const uniqueTodaySchedule = useMemo(() => {
    const map = new Map();
    for (const item of todaySchedule) {
      // Key uniquely defines a timetable session by day, period, section ID/name, subject ID/name, and room
      const secKey = String(item.sectionId?._id || item.sectionId || (typeof item.section === 'string' ? item.section : item.section?.name) || '');
      const subKey = String(item.subjectId?._id || item.subjectId || (typeof item.subject === 'string' ? item.subject : item.subject?.name) || '');
      const perKey = String(typeof item.period === 'string' ? item.period : (item.period?.periodNumber || item.periodOrder || ''));
      const roomKey = String(item.roomId?._id || item.roomId || item.room || '');
      const dayKey = String(item.day || '');

      const sessionKey = [dayKey, perKey, secKey, subKey, roomKey].join('|');

      if (!map.has(sessionKey)) {
        map.set(sessionKey, item);
      } else {
        const existing = map.get(sessionKey);
        if ((item.isSubstituted || item.hasConflict) && !existing.isSubstituted && !existing.hasConflict) {
          map.set(sessionKey, item);
        }
      }
    }

    const list = Array.from(map.values());
    // Strict chronological sort by period start time, then end time, then periodOrder
    return list.sort((a, b) => {
      const startA = parse12hToMinutes(a.startTime || (a.time ? a.time.split('-')[0] : ''));
      const startB = parse12hToMinutes(b.startTime || (b.time ? b.time.split('-')[0] : ''));
      if (startA !== startB) return startA - startB;

      const endA = parse12hToMinutes(a.endTime || (a.time ? a.time.split('-')[1] : ''));
      const endB = parse12hToMinutes(b.endTime || (b.time ? b.time.split('-')[1] : ''));
      if (endA !== endB) return endA - endB;

      return (a.periodOrder || 0) - (b.periodOrder || 0);
    });
  }, [todaySchedule]);

  // Combined search and multi-dropdown filtering
  const filteredSchedule = useMemo(() => {
    const filtered = uniqueTodaySchedule.filter((item) => {
      // 1. Text search (matches subject name/code, faculty name/id, section, room/venue)
      if (ttSearchQuery.trim()) {
        const q = ttSearchQuery.toLowerCase().trim();
        const subName = (typeof item.subject === 'string' ? item.subject : item.subject?.name || '').toLowerCase();
        const subCode = (item.subjectCode || item.subject?.code || '').toLowerCase();
        const facName = (typeof item.faculty === 'string' ? item.faculty : item.faculty?.fullName || '').toLowerCase();
        const facId = (item.facultyId || '').toLowerCase();
        const subFac = (item.substituteFaculty || '').toLowerCase();
        const origFac = (item.originalFaculty || '').toLowerCase();
        const secName = (typeof item.section === 'string' ? item.section : item.section?.name || '').toLowerCase();
        const semName = (item.semester || '').toLowerCase();
        const roomNum = (item.room || item.roomDetails?.roomNumber || '').toLowerCase();
        const roomType = (item.roomType || '').toLowerCase();
        const venueName = (item.venueName || '').toLowerCase();

        const match = subName.includes(q) || subCode.includes(q) ||
                      facName.includes(q) || facId.includes(q) || subFac.includes(q) || origFac.includes(q) ||
                      secName.includes(q) || semName.includes(q) ||
                      roomNum.includes(q) || roomType.includes(q) || venueName.includes(q);

        if (!match) return false;
      }

      // 2. Subject dropdown
      if (ttSubjectFilter !== 'ALL') {
        const itemSubId = String(item.subjectId?._id || item.subjectId || '');
        const itemSubName = typeof item.subject === 'string' ? item.subject : (item.subject?.name || '');
        const itemSubCode = item.subjectCode || item.subject?.code || '';

        const selectedOpt = subjectFilterOptions.find(
          (opt) => opt.id === ttSubjectFilter || opt.name.toLowerCase() === ttSubjectFilter.toLowerCase()
        );

        let matches = false;
        if (selectedOpt) {
          if (itemSubId && selectedOpt.id && itemSubId === selectedOpt.id) matches = true;
          if (!matches && itemSubName && selectedOpt.name && itemSubName.toLowerCase() === selectedOpt.name.toLowerCase()) matches = true;
          if (!matches && itemSubCode && selectedOpt.code && itemSubCode.toLowerCase() === selectedOpt.code.toLowerCase()) matches = true;
        } else {
          matches = (itemSubId && itemSubId === ttSubjectFilter) ||
                    (itemSubName && itemSubName.toLowerCase() === ttSubjectFilter.toLowerCase()) ||
                    (itemSubCode && itemSubCode.toLowerCase() === ttSubjectFilter.toLowerCase());
        }

        if (!matches) return false;
      }

      // 3. Faculty dropdown
      if (ttFacultyFilter !== 'ALL') {
        const itemFacDocId = String(item.facultyDocId || item.faculty?._id || '');
        const itemFacId = String(item.facultyId || '');
        const itemFacName = typeof item.faculty === 'string' ? item.faculty : (item.faculty?.fullName || '');
        const subFac = item.substituteFaculty || '';
        const origFac = item.originalFaculty || '';

        const selectedOpt = facultyFilterOptions.find(
          (opt) => opt.id === ttFacultyFilter || opt.name.toLowerCase() === ttFacultyFilter.toLowerCase()
        );

        let matches = false;
        if (selectedOpt) {
          if (itemFacDocId && selectedOpt.id && itemFacDocId === selectedOpt.id) matches = true;
          if (!matches && itemFacId && selectedOpt.facultyId && itemFacId === selectedOpt.facultyId) matches = true;
          if (!matches && itemFacName && selectedOpt.name && itemFacName.toLowerCase() === selectedOpt.name.toLowerCase()) matches = true;
          if (!matches && subFac && selectedOpt.name && subFac.toLowerCase() === selectedOpt.name.toLowerCase()) matches = true;
          if (!matches && origFac && selectedOpt.name && origFac.toLowerCase() === selectedOpt.name.toLowerCase()) matches = true;
        } else {
          const q = ttFacultyFilter.toLowerCase();
          matches = (itemFacDocId && itemFacDocId === ttFacultyFilter) ||
                    (itemFacId && itemFacId.toLowerCase() === q) ||
                    (itemFacName && itemFacName.toLowerCase() === q) ||
                    (subFac && subFac.toLowerCase() === q) ||
                    (origFac && origFac.toLowerCase() === q);
        }

        if (!matches) return false;
      }

      // 4. Section dropdown (matches by stable database ID or section name)
      if (ttSectionFilter !== 'ALL') {
        const itemSecId = String(item.sectionId?._id || item.sectionId || '');
        const itemSecName = typeof item.section === 'string' ? item.section : (item.section?.name || '');

        const selectedOpt = sectionFilterOptions.find(
          (opt) => opt.id === ttSectionFilter || opt.name.toLowerCase() === ttSectionFilter.toLowerCase()
        );

        let matches = false;
        if (selectedOpt) {
          if (itemSecId && selectedOpt.id && itemSecId === selectedOpt.id) {
            matches = true;
          }
          if (!matches && itemSecName && selectedOpt.name && itemSecName.toLowerCase() === selectedOpt.name.toLowerCase()) {
            if (item.semester && selectedOpt.semester) {
              matches = item.semester.toLowerCase() === selectedOpt.semester.toLowerCase();
            } else {
              matches = true;
            }
          }
        } else {
          matches = (itemSecId && itemSecId === ttSectionFilter) ||
                    (itemSecName && itemSecName.toLowerCase() === ttSectionFilter.toLowerCase());
        }

        if (!matches) return false;
      }

      // 5. Room dropdown
      if (ttRoomFilter !== 'ALL') {
        const itemRoomId = String(item.roomId?._id || item.roomId || '');
        const itemRoom = (item.room || item.roomDetails?.roomNumber || '').toLowerCase();
        const itemVenueName = (item.venueName || '').toLowerCase();
        const q = ttRoomFilter.toLowerCase();

        const matches = (itemRoomId && itemRoomId === ttRoomFilter) ||
                        itemRoom === q ||
                        itemVenueName === q;

        if (!matches) return false;
      }

      return true;
    });

    // Ensure strict chronological sort by start time, end time, and period order
    return filtered.sort((a, b) => {
      const startA = parse12hToMinutes(a.startTime || (a.time ? a.time.split('-')[0] : ''));
      const startB = parse12hToMinutes(b.startTime || (b.time ? b.time.split('-')[0] : ''));
      if (startA !== startB) return startA - startB;

      const endA = parse12hToMinutes(a.endTime || (a.time ? a.time.split('-')[1] : ''));
      const endB = parse12hToMinutes(b.endTime || (b.time ? b.time.split('-')[1] : ''));
      if (endA !== endB) return endA - endB;

      return (a.periodOrder || 0) - (b.periodOrder || 0);
    });
  }, [uniqueTodaySchedule, ttSearchQuery, ttSubjectFilter, ttFacultyFilter, ttSectionFilter, ttRoomFilter, sectionFilterOptions, subjectFilterOptions, facultyFilterOptions]);

  const hasActiveFilters = Boolean(
    ttSearchQuery.trim() ||
    ttSubjectFilter !== 'ALL' ||
    ttFacultyFilter !== 'ALL' ||
    ttSectionFilter !== 'ALL' ||
    ttRoomFilter !== 'ALL'
  );

  const handleClearFilters = () => {
    setTtSearchQuery('');
    setTtSubjectFilter('ALL');
    setTtFacultyFilter('ALL');
    setTtSectionFilter('ALL');
    setTtRoomFilter('ALL');
  };

  const getGreeting = () => {
    const hours = currentTime.getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const deanDisplayName = user?.fullName || 'Dr. R Kumar';
  const greetingText = `${getGreeting()}, ${deanDisplayName}`;

  return (
    <div className="dp-dashboard-container">
      {/* 1. TOP HEADER & GREETING */}
      <div className="dp-greeting-card">
        <div>
          <h1 className="dp-dashboard-main-title">{greetingText}</h1>
          <div className="dp-dashboard-subtitle">
            <span>Computer Science Department — Academic Overview</span>
          </div>
        </div>

        <div className="dp-greeting-time-box">
          <div className="dp-live-time-display">
            <Clock size={16} style={{ color: 'var(--dp-primary)', marginRight: '6px' }} />
            <span>{formattedTime12h}</span>
          </div>
          <div className="dp-live-date-display">{formattedDate}</div>
        </div>
      </div>

      {/* 2. QUICK SEARCH BAR (Class / Faculty / Room) */}
      <div className="dp-quick-search-section" ref={searchBoxRef}>
        <form onSubmit={handleSearchSubmit}>
          <div className="dp-quick-search-bar">
            <Search size={20} className="dp-search-icon" />
            <input
              type="text"
              className="dp-quick-search-input"
              placeholder="Search class, faculty or room..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              id="dean-quick-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="dp-search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                }}
                aria-label="Clear Search"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="dp-btn-primary dp-btn-quick-search-go"
            >
              <span>Search</span>
            </button>
          </div>
        </form>

        {/* Live Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="dp-quick-suggestions-dropdown">
            <div className="dp-suggestions-header">Instant Academic Suggestions</div>
            {suggestions.map((item, idx) => (
              <div
                key={`${item.type}-${item.id || idx}`}
                className="dp-suggestion-item"
                onClick={() => {
                  setShowSuggestions(false);
                  navigate(item.url);
                }}
              >
                <div className="dp-sugg-type-badge">{item.type}</div>
                <div className="dp-sugg-content">
                  <div className="dp-sugg-title">{item.title}</div>
                  <div className="dp-sugg-sub">{item.subtitle}</div>
                </div>
                <ChevronRight size={16} className="dp-sugg-arrow" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. SIX CORE SUMMARY CARDS (Strictly Real MongoDB data) */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Calculating live academic status from MongoDB...</span>
        </div>
      ) : error ? (
        <div className="dp-form-alert error">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button
            type="button"
            className="dp-btn dp-btn-outline dp-btn-sm"
            onClick={fetchDashboard}
            style={{ marginLeft: 'auto' }}
          >
            <RefreshCw size={14} />
            <span>Retry</span>
          </button>
        </div>
      ) : (
        <>
          <div className="dp-six-metrics-grid">
            {/* 1. TODAY'S CLASSES */}
            <div
              className="dp-stat-card"
              onClick={() => navigate('/dean/timetable')}
              title="Inspect Master Timetable"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Today's Classes</span>
                <span className="dp-stat-icon-wrap purple"><Calendar size={18} /></span>
              </div>
              <div className="dp-stat-value">{liveStats.totalClasses ?? todaySchedule.length ?? 0}</div>
              <div className="dp-stat-subtext">Classes scheduled today</div>
            </div>

            {/* 2. CLASSES RUNNING NOW */}
            <div
              className="dp-stat-card"
              id="kpi-card-classes-running"
              onClick={() => handleOpenLiveModal('LIVE_CLASSES')}
              title="Inspect live running classes"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Classes Running Now</span>
                <span className="dp-stat-icon-wrap live"><Activity size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-live">{liveStats.classesRunningNow ?? 0}</div>
              <div className="dp-stat-subtext">
                {(liveStats.classesRunningNow ?? 0) === 0 ? 'No classes in progress' : 'Classes currently in progress'}
              </div>
            </div>

            {/* 3. AVAILABLE ROOMS */}
            <div
              className="dp-stat-card"
              id="kpi-card-available-rooms"
              onClick={() => handleOpenLiveModal('AVAILABLE_ROOMS')}
              title="Inspect Free & Available Venues"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Available Rooms</span>
                <span className="dp-stat-icon-wrap green"><DoorOpen size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-green">{liveStats.freeRooms ?? 0}</div>
              <div className="dp-stat-subtext">Rooms currently available</div>
            </div>

            {/* 4. OCCUPIED ROOMS */}
            <div
              className="dp-stat-card"
              id="kpi-card-occupied-rooms"
              onClick={() => handleOpenLiveModal('OCCUPIED_ROOMS')}
              title="Inspect Occupied Venues"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Occupied Rooms</span>
                <span className="dp-stat-icon-wrap red"><DoorOpen size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-red">{liveStats.occupiedRooms ?? 0}</div>
              <div className="dp-stat-subtext">Rooms currently in use</div>
            </div>

            {/* 5. FACULTY TEACHING NOW */}
            <div
              className="dp-stat-card"
              id="kpi-card-faculty-teaching"
              onClick={() => handleOpenLiveModal('TEACHING_FACULTY')}
              title="Inspect Faculty Currently Teaching"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Faculty Teaching Now</span>
                <span className="dp-stat-icon-wrap orange"><Users size={18} /></span>
              </div>
              <div className="dp-stat-value highlight-orange">{liveStats.facultyInClass ?? 0}</div>
              <div className="dp-stat-subtext">Faculty currently teaching</div>
            </div>

            {/* 6. FACULTY AVAILABLE */}
            <div
              className="dp-stat-card"
              id="kpi-card-faculty-available"
              onClick={() => handleOpenLiveModal('AVAILABLE_FACULTY')}
              title="Inspect Available Faculty Directory"
            >
              <div className="dp-stat-top">
                <span className="dp-stat-title">Faculty Available</span>
                <span className="dp-stat-icon-wrap blue"><UserCheck size={18} /></span>
              </div>
              <div className="dp-stat-value">{liveStats.freeFaculty ?? 0}</div>
              <div className="dp-stat-subtext">Faculty without a current class</div>
            </div>
          </div>

          {/* 4. LIVE DASHBOARD STATUS: CLASSES RUNNING NOW */}
          <div className="dp-section-card">
            <div className="dp-section-card-header">
              <div>
                <div className="dp-section-card-title">
                  <span className="dp-status-dot red"></span>
                  <span>Classes Running Now</span>
                </div>
                <div className="dp-section-card-sub">
                  Classes currently in progress
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  className="dp-btn dp-btn-primary dp-btn-sm"
                  onClick={() => handleOpenLiveModal('LIVE_CLASSES')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Activity size={14} />
                  <span>Live Classes Now ({currentlyActiveClasses.length})</span>
                </button>
                <Link to="/dean/timetable" className="dp-btn-link">
                  <span>Schedule</span>
                  <ExternalLink size={14} />
                </Link>
              </div>
            </div>

            {currentlyActiveClasses.length > 0 ? (
              <div className="dp-live-classes-grid">
                {currentlyActiveClasses.map((item) => {
                  const secSplit = formatAcademicSectionSplit(item.section, item.semester);
                  const roomSplit = formatAcademicRoom(item.room, item.roomType);
                  const timeFormatted = formatTimeRange12h(item.time);
                  return (
                    <div
                      key={item._id}
                      className="dp-live-class-card"
                      onClick={() => {
                        if (openEntityDrawer) {
                          openEntityDrawer({
                            entityType: 'TIMETABLE',
                            id: item._id,
                            title: `${item.period} — ${item.subject}`,
                            details: item
                          });
                        } else if (item.sectionId) {
                          navigate(`/dean/class-search?section=${item.sectionId}`);
                        } else {
                          navigate('/dean/timetable');
                        }
                      }}
                    >
                      <div className="dp-live-card-top">
                        <span className="dp-period-badge">{item.period}</span>
                        <span className="dp-live-time-range">{timeFormatted}</span>
                        <span className="dp-status-badge live">LIVE NOW</span>
                      </div>

                      <div className="dp-live-subject">{item.subject}</div>

                      <div className="dp-live-meta-grid">
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Section:</span>
                          <span className="dp-live-val">
                            {secSplit.program ? `${secSplit.program} — ${secSplit.section}` : secSplit.section}
                          </span>
                        </div>
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Faculty:</span>
                          <div className="dp-live-faculty-wrap">
                            <span className="dp-live-val">{formatAcademicFaculty(item.faculty)}</span>
                            {item.isSubstituted && (
                              <span className="dp-badge-substituted">SUBSTITUTED</span>
                            )}
                          </div>
                        </div>
                        <div className="dp-live-meta-row">
                          <span className="dp-live-label">Room:</span>
                          <span className="dp-live-val">{roomSplit.number}</span>
                          {roomSplit.type && <span className="dp-live-room-type">({roomSplit.type})</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dp-empty-live-box">
                <div className="dp-empty-live-icon-wrap">
                  <Clock size={28} className="dp-empty-live-icon" />
                </div>
                <div className="dp-empty-live-text-wrap">
                  <div className="dp-empty-live-heading">No Classes Running Now</div>
                  <div className="dp-empty-live-description">There are no active classes at the moment.</div>
                </div>
                <button
                  type="button"
                  className="dp-btn dp-btn-primary dp-btn-sm dp-empty-live-btn"
                  onClick={() => handleOpenLiveModal('LIVE_CLASSES')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Activity size={14} />
                  <span>Inspect Live Status</span>
                </button>
              </div>
            )}
          </div>

          {/* 5. OVERVIEW DUAL CARDS: ROOM AVAILABILITY & FACULTY STATUS */}
          <div className="dp-overview-dual-grid">
            {/* ROOM AVAILABILITY */}
            <div className="dp-overview-card">
              <div className="dp-overview-card-header">
                <div>
                  <h3 className="dp-overview-title">Room Availability</h3>
                  <p className="dp-overview-sub">Current room usage across the department</p>
                </div>
                <button
                  type="button"
                  className="dp-btn-sm dp-btn-outline"
                  onClick={() => handleOpenLiveModal('AVAILABLE_ROOMS')}
                  style={{ cursor: 'pointer' }}
                >
                  View Rooms &rarr;
                </button>
              </div>

              <div className="dp-util-split-stats">
                <div
                  className="dp-util-stat-box green"
                  onClick={() => handleOpenLiveModal('AVAILABLE_ROOMS')}
                  title="Click to view Available Rooms"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="dp-util-num">{liveStats.freeRooms ?? 0}</span>
                  <span className="dp-util-lbl">Available Rooms</span>
                </div>
                <div
                  className="dp-util-stat-box red"
                  onClick={() => handleOpenLiveModal('OCCUPIED_ROOMS')}
                  title="Click to inspect Occupied Rooms"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="dp-util-num">{liveStats.occupiedRooms ?? 0}</span>
                  <span className="dp-util-lbl">Occupied Rooms</span>
                </div>
              </div>

              <div className="dp-util-total-strip">
                <span>Total Rooms: <strong>{liveStats.totalRooms || 30}</strong></span>
                <span
                  className="dp-util-link"
                  onClick={() => handleOpenLiveModal('AVAILABLE_ROOMS')}
                  style={{ cursor: 'pointer' }}
                >
                  View Rooms →
                </span>
              </div>
            </div>

            {/* FACULTY STATUS */}
            <div className="dp-overview-card">
              <div className="dp-overview-card-header">
                <div>
                  <h3 className="dp-overview-title">Faculty Status</h3>
                  <p className="dp-overview-sub">Current teaching availability</p>
                </div>
                <button
                  type="button"
                  className="dp-btn-sm dp-btn-outline"
                  onClick={() => handleOpenLiveModal('AVAILABLE_FACULTY')}
                  style={{ cursor: 'pointer' }}
                >
                  View Faculty →
                </button>
              </div>

              <div className="dp-util-split-stats">
                <div
                  className="dp-util-stat-box orange"
                  onClick={() => handleOpenLiveModal('TEACHING_FACULTY')}
                  title="Click to view Faculty Teaching Now"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="dp-util-num">{liveStats.facultyInClass ?? 0}</span>
                  <span className="dp-util-lbl">Teaching Now</span>
                </div>
                <div
                  className="dp-util-stat-box blue"
                  onClick={() => handleOpenLiveModal('AVAILABLE_FACULTY')}
                  title="Click to view Available Faculty"
                  style={{ cursor: 'pointer' }}
                >
                  <span className="dp-util-num">{liveStats.freeFaculty ?? 0}</span>
                  <span className="dp-util-lbl">Available</span>
                </div>
              </div>

              <div className="dp-util-total-strip">
                <span>Total Faculty: <strong>{liveStats.totalFaculty || metrics.activeFaculty || 15}</strong></span>
                <span
                  className="dp-util-link"
                  onClick={() => handleOpenLiveModal('AVAILABLE_FACULTY')}
                  style={{ cursor: 'pointer' }}
                >
                  View Faculty →
                </span>
              </div>
            </div>
          </div>

          {/* 6. TODAY'S TIMETABLE (REDESIGNED) */}
          <div className="dp-section-card dp-timetable-card" id="todays-timetable-section">
            {/* Header */}
            <div className="dp-tt-header">
              <div className="dp-tt-header-left">
                <div className="dp-tt-icon-container">
                  <Calendar size={22} />
                </div>
                <div className="dp-tt-header-titles">
                  <h2 className="dp-tt-heading">Today's Timetable</h2>
                  <div className="dp-tt-subtitle">
                    <span>Computer Science Department</span>
                    <span className="dp-tt-sub-dot">•</span>
                    <span>{formattedDate}</span>
                  </div>
                </div>
              </div>

              <Link to="/dean/timetable" className="dp-tt-view-full-btn" id="view-full-timetable-btn">
                <span>View Full Timetable</span>
                <ArrowRight size={15} />
              </Link>
            </div>

            {/* Search and Filter Toolbar */}
            <div className="dp-tt-toolbar">
              {/* Search Field */}
              <div className="dp-tt-search-wrap">
                <Search size={16} className="dp-tt-search-icon" />
                <input
                  type="text"
                  className="dp-tt-search-input"
                  placeholder="Search subject, faculty, section, or room..."
                  value={ttSearchQuery}
                  onChange={(e) => setTtSearchQuery(e.target.value)}
                  id="tt-search-input"
                  aria-label="Search timetable sessions"
                />
                {ttSearchQuery && (
                  <button
                    type="button"
                    className="dp-tt-search-clear"
                    onClick={() => setTtSearchQuery('')}
                    title="Clear search query"
                    aria-label="Clear search query"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Subject Dropdown */}
              <div className="dp-tt-select-wrap">
                <select
                  className="dp-tt-select"
                  value={ttSubjectFilter}
                  onChange={(e) => setTtSubjectFilter(e.target.value)}
                  id="tt-filter-subject"
                  aria-label="Filter by subject"
                >
                  <option value="ALL">All Subjects</option>
                  {subjectFilterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Faculty Dropdown */}
              <div className="dp-tt-select-wrap">
                <select
                  className="dp-tt-select"
                  value={ttFacultyFilter}
                  onChange={(e) => setTtFacultyFilter(e.target.value)}
                  id="tt-filter-faculty"
                  aria-label="Filter by faculty"
                >
                  <option value="ALL">All Faculty</option>
                  {facultyFilterOptions.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Section Dropdown */}
              <div className="dp-tt-select-wrap">
                <select
                  className="dp-tt-select"
                  value={ttSectionFilter}
                  onChange={(e) => setTtSectionFilter(e.target.value)}
                  id="tt-filter-section"
                  aria-label="Filter by section"
                >
                  <option value="ALL">All Sections</option>
                  {sectionFilterOptions.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Room Dropdown */}
              <div className="dp-tt-select-wrap">
                <select
                  className="dp-tt-select"
                  value={ttRoomFilter}
                  onChange={(e) => setTtRoomFilter(e.target.value)}
                  id="tt-filter-room"
                  aria-label="Filter by room"
                >
                  <option value="ALL">All Rooms</option>
                  {roomFilterOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset / Clear Filters Action */}
              {hasActiveFilters && (
                <button
                  type="button"
                  className="dp-tt-clear-btn"
                  onClick={handleClearFilters}
                  title="Clear all active filters"
                  aria-label="Clear all active filters"
                  id="tt-clear-filters-btn"
                >
                  <RotateCcw size={13} />
                  <span>Clear Filters</span>
                </button>
              )}
            </div>

            {/* Timetable Table */}
            <div className="dp-table-container dp-tt-table-container">
              <table className="dp-table dp-tt-table">
                <thead>
                  <tr>
                    <th style={{ width: '85px' }}>PERIOD</th>
                    <th style={{ width: '160px' }}>TIME</th>
                    <th style={{ minWidth: '180px' }}>SUBJECT</th>
                    <th style={{ minWidth: '160px' }}>FACULTY</th>
                    <th style={{ width: '150px' }}>SECTION</th>
                    <th style={{ width: '130px' }}>ROOM</th>
                    <th style={{ width: '130px' }}>STATUS</th>
                    <th style={{ width: '90px', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedule.length > 0 ? (
                    filteredSchedule.map((item) => {
                      const secSplit = formatAcademicSectionSplit(item.section, item.semester);
                      const roomSplit = formatAcademicRoom(item.room, item.roomType);
                      const timeFormatted = formatTimeRange12h(item.time);
                      const currentMinutesNow = currentTime ? (currentTime.getHours() * 60 + currentTime.getMinutes()) : null;
                      const statusMeta = getSessionStatusMeta(item, currentMinutesNow);
                      const isUnassigned = !item.faculty || item.faculty === 'Faculty Not Assigned' || item.faculty === 'Not Assigned';

                      return (
                        <tr
                          key={item._id}
                          onClick={() => {
                            if (openEntityDrawer) {
                              openEntityDrawer({
                                entityType: 'TIMETABLE',
                                id: item._id,
                                title: `${item.period} — ${item.subject}`,
                                details: item
                              });
                            }
                          }}
                          style={{ cursor: 'pointer' }}
                          className={`dp-tt-row ${statusMeta.isLive ? 'dp-row-live' : ''}`}
                        >
                          {/* 1. Period */}
                          <td className="dp-tt-td-period">
                            <span className="dp-tt-period-badge">{item.period}</span>
                          </td>

                          {/* 2. Time */}
                          <td className="dp-tt-td-time">
                            <span className="dp-tt-time-val">{timeFormatted}</span>
                          </td>

                          {/* 3. Subject */}
                          <td className="dp-tt-td-subject">
                            <div className="dp-tt-subject-cell">
                              <span className="dp-tt-subject-name">{item.subject}</span>
                              {item.subjectCode && (
                                <span className="dp-tt-subject-code">{item.subjectCode}</span>
                              )}
                            </div>
                          </td>

                          {/* 4. Faculty */}
                          <td className="dp-tt-td-faculty">
                            <div className="dp-tt-faculty-cell">
                              {item.isSubstituted && item.originalFaculty ? (
                                <div className="dp-tt-faculty-sub-wrap">
                                  <span className="dp-tt-faculty-name">{formatAcademicFaculty(item.faculty)}</span>
                                  <span className="dp-tt-sub-label">Sub for {formatAcademicFaculty(item.originalFaculty)}</span>
                                  <span className="dp-tt-sub-tag">SUBSTITUTED</span>
                                </div>
                              ) : isUnassigned ? (
                                <span className="dp-tt-faculty-unassigned">Not Assigned</span>
                              ) : (
                                <div className="dp-tt-faculty-wrap">
                                  <span className="dp-tt-faculty-name">{formatAcademicFaculty(item.faculty)}</span>
                                  {item.isSubstituted && <span className="dp-tt-sub-tag">SUBSTITUTED</span>}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* 5. Section */}
                          <td className="dp-tt-td-section">
                            <div className="dp-tt-section-cell">
                              {secSplit.program ? (
                                <>
                                  <span className="dp-tt-section-prog">{secSplit.program}</span>
                                  <span className="dp-tt-section-name">{secSplit.section}</span>
                                </>
                              ) : (
                                <span className="dp-tt-section-name-only">{secSplit.section}</span>
                              )}
                            </div>
                          </td>

                          {/* 6. Room */}
                          <td className="dp-tt-td-room">
                            <div className="dp-tt-room-cell">
                              <span className="dp-tt-room-num">{roomSplit.number}</span>
                              {roomSplit.type && (
                                <span className="dp-tt-room-type">{roomSplit.type}</span>
                              )}
                            </div>
                          </td>

                          {/* 7. Status */}
                          <td className="dp-tt-td-status">
                            <span className={`dp-tt-status-badge ${statusMeta.classType}`}>
                              {statusMeta.isLive && <span className="dp-tt-live-pulse-dot" />}
                              {statusMeta.label}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td
                            className="dp-tt-td-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="dp-tt-actions-wrap">
                              <button
                                type="button"
                                className="dp-tt-action-btn view"
                                title="View details"
                                aria-label="View details"
                                onClick={() => {
                                  if (openEntityDrawer) {
                                    openEntityDrawer({
                                      entityType: 'TIMETABLE',
                                      id: item._id,
                                      title: `${item.period} — ${item.subject}`,
                                      details: item
                                    });
                                  }
                                }}
                              >
                                <Eye size={15} />
                              </button>
                              <button
                                type="button"
                                className="dp-tt-action-btn edit"
                                title="Edit in Master Timetable"
                                aria-label="Edit in Master Timetable"
                                onClick={() => navigate('/dean/timetable')}
                              >
                                <Edit2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" style={{ padding: '0', border: 'none' }}>
                        <div className="dp-tt-empty-box">
                          <Calendar size={28} className="dp-tt-empty-icon" />
                          <div className="dp-tt-empty-title">
                            {hasActiveFilters ? 'No Matching Timetable Sessions' : 'No Timetable Sessions Scheduled for Today'}
                          </div>
                          <div className="dp-tt-empty-desc">
                            {hasActiveFilters
                              ? 'No timetable classes match the active search criteria and filters. Try adjusting your selections or clearing filters.'
                              : `There are no academic classes scheduled on ${formattedDate}. Check the full weekly timetable to inspect other days.`}
                          </div>
                          {hasActiveFilters && (
                            <button
                              type="button"
                              className="dp-tt-empty-reset-btn"
                              onClick={handleClearFilters}
                            >
                              <RotateCcw size={13} />
                              <span>Reset All Filters</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer and Summary */}
            <div className="dp-tt-footer">
              <div className="dp-tt-footer-count">
                Showing <strong>{filteredSchedule.length}</strong> of <strong>{uniqueTodaySchedule.length}</strong> timetable sessions
              </div>

              <div className="dp-tt-footer-legend">
                <span className="dp-tt-legend-label">Status:</span>
                <span className="dp-tt-legend-item">
                  <span className="dp-tt-legend-dot live" /> In Progress
                </span>
                <span className="dp-tt-legend-item">
                  <span className="dp-tt-legend-dot upcoming" /> Scheduled
                </span>
                <span className="dp-tt-legend-item">
                  <span className="dp-tt-legend-dot completed" /> Completed
                </span>
                <span className="dp-tt-legend-item">
                  <span className="dp-tt-legend-dot substituted" /> Substituted
                </span>
                <span className="dp-tt-legend-item">
                  <span className="dp-tt-legend-dot conflict" /> Conflict
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* DEDICATED LIVE ACADEMIC STATUS & OPERATIONS MODAL */}
      <LiveAcademicStatusModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        initialTab={liveModalTab}
        dashboardData={dashboardData}
        onSelectClass={(item) => {
          if (openEntityDrawer) {
            openEntityDrawer({
              entityType: 'TIMETABLE',
              id: item._id,
              title: `${item.period} — ${item.subject}`,
              details: item
            });
          } else if (item.sectionId) {
            navigate(`/dean/class-search?section=${item.sectionId}`);
          } else {
            navigate('/dean/timetable');
          }
        }}
      />
    </div>
  );
};

export default DeanDashboardPage;
