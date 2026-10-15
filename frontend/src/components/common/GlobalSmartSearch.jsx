import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  Users,
  DoorOpen,
  FlaskConical,
  Tv,
  BookOpen,
  Layers,
  Calendar,
  ArrowRightLeft,
  GraduationCap,
  ExternalLink,
  CornerDownLeft,
  Command
} from 'lucide-react';
import deanApi from '../../api/dean';
import { useAuth } from '../../context/AuthContext';

// Map categories to friendly icons and color accents
const CATEGORY_CONFIG = {
  FACULTY: {
    label: 'Faculty Members',
    icon: Users,
    color: '#6D3DF5',
    bg: 'rgba(109, 61, 245, 0.1)'
  },
  CLASSROOMS: {
    label: 'Classrooms',
    icon: DoorOpen,
    color: '#0EA5E9',
    bg: 'rgba(14, 165, 233, 0.1)'
  },
  LABS: {
    label: 'Laboratories',
    icon: FlaskConical,
    color: '#10B981',
    bg: 'rgba(16, 185, 129, 0.1)'
  },
  AUDITORIUMS: {
    label: 'Auditoriums',
    icon: Tv,
    color: '#F59E0B',
    bg: 'rgba(245, 158, 11, 0.1)'
  },
  SUBJECTS: {
    label: 'Subjects & Courses',
    icon: BookOpen,
    color: '#8B5CF6',
    bg: 'rgba(139, 92, 246, 0.1)'
  },
  SECTIONS: {
    label: 'Class Sections',
    icon: Layers,
    color: '#EC4899',
    bg: 'rgba(236, 72, 153, 0.1)'
  },
  TIMETABLE: {
    label: 'Timetable Sessions',
    icon: Calendar,
    color: '#14B8A6',
    bg: 'rgba(20, 184, 166, 0.1)'
  },
  SUBSTITUTIONS: {
    label: 'Substitutions',
    icon: ArrowRightLeft,
    color: '#F97316',
    bg: 'rgba(249, 115, 22, 0.1)'
  },
  SEMESTERS: {
    label: 'Semesters',
    icon: GraduationCap,
    color: '#6366F1',
    bg: 'rgba(99, 102, 241, 0.1)'
  }
};

// Highlight matched substring helper
const highlightMatch = (text, query) => {
  if (!text || !query) return text || '';
  const trimmed = query.trim();
  if (trimmed.length < 2) return text;

  try {
    const escaped = trimmed.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = String(text).split(regex);

    return parts.map((part, idx) =>
      regex.test(part) ? (
        <mark key={idx} className="dp-search-highlight">
          {part}
        </mark>
      ) : (
        part
      )
    );
  } catch {
    return text;
  }
};

export const GlobalSmartSearch = ({
  placeholder = 'Search faculty, classes, rooms...',
  className = '',
  onSelectResult = null,
  compact = false
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [error, setError] = useState(null);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const requestIdRef = useRef(0);

  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const isAdmin = user?.role === 'ADMIN';

  // Detect OS for shortcut label (⌘K on Mac, Ctrl K on Windows/Linux)
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  // Flatten categorized results into a single indexable array for smooth keyboard navigation
  const flatResults = React.useMemo(() => {
    if (!results || !results.categorized) return [];
    const items = [];
    Object.entries(results.categorized).forEach(([catKey, catItems]) => {
      if (Array.isArray(catItems) && catItems.length > 0) {
        catItems.forEach((item) => {
          items.push({ ...item, categoryKey: catKey });
        });
      }
    });
    return items;
  }, [results]);

  // Execute debounced academic search against backend API
  const performSearch = useCallback(async (searchTerm) => {
    const normalized = (searchTerm || '').trim();

    if (normalized.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    const currentRequestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      // Limit to 5 results per category for live suggestions dropdown
      const res = await deanApi.search(normalized, 'ALL', 5);

      // Prevent stale async response from overwriting newer query results
      if (currentRequestId === requestIdRef.current) {
        setResults(res.data);
        setActiveIndex(0); // Auto-select first item for fast Enter navigation
      }
    } catch (err) {
      if (currentRequestId === requestIdRef.current) {
        console.error('Global search error:', err);
        setError('Unable to fetch academic records. Please try again.');
        setResults(null);
      }
    } finally {
      if (currentRequestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Handle typing with 250ms debouncing
  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(val);
    }, 250);
  };

  // Global Ctrl+K / ⌘K listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Navigate to selected academic result
  const handleSelect = (item) => {
    setIsOpen(false);
    setQuery('');
    setResults(null);

    if (onSelectResult) {
      onSelectResult(item);
      return;
    }

    let targetUrl = item.navigationUrl || item.fallbackUrl;

    if (isAdmin && targetUrl) {
      if (item.category === 'FACULTY') targetUrl = '/admin/faculty';
      else if (item.category === 'CLASSROOMS') targetUrl = '/admin/classrooms';
      else if (item.category === 'LABS') targetUrl = '/admin/labs';
      else if (item.category === 'AUDITORIUMS') targetUrl = '/admin/auditoriums';
      else if (item.category === 'SUBJECTS') targetUrl = '/admin/subjects';
      else if (item.category === 'SECTIONS') targetUrl = '/admin/class-sections';
      else if (item.category === 'TIMETABLE') targetUrl = '/admin/timetable';
      else if (item.category === 'SEMESTERS') targetUrl = '/admin/semesters';
    }

    if (targetUrl) {
      navigate(targetUrl);
    } else {
      navigate(isAdmin ? '/admin/dashboard' : `/dean/search?q=${encodeURIComponent(item.title)}`);
    }
  };

  // Keyboard navigation within the suggestions dropdown
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((prev) => (prev + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatResults.length === 0) return;
      setActiveIndex((prev) => (prev <= 0 ? flatResults.length - 1 : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatResults.length) {
        handleSelect(flatResults[activeIndex]);
      } else if (query.trim()) {
        // Direct search page submission
        setIsOpen(false);
        navigate(`/dean/search?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  // Auto-scroll active item into visible dropdown view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const handleClear = () => {
    setQuery('');
    setResults(null);
    setError(null);
    setLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className={`dp-global-smart-search ${className} ${compact ? 'is-compact' : ''}`}
      style={{ position: 'relative' }}
    >
      {/* Search Input Bar */}
      <div className={`dp-smart-search-input-wrap ${isOpen && results ? 'has-open-dropdown' : ''}`}>
        <div className="dp-smart-search-icon-left">
          {loading ? (
            <Loader2 size={16} className="dp-search-spinner" />
          ) : (
            <Search size={16} className="dp-search-icon-static" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="dp-smart-search-input"
          autoComplete="off"
          spellCheck="false"
          aria-label="Global Academic Search"
          aria-expanded={isOpen}
          aria-autocomplete="list"
        />

        <div className="dp-smart-search-actions-right">
          {query ? (
            <button
              type="button"
              className="dp-smart-search-clear-btn"
              onClick={handleClear}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <kbd className="dp-smart-search-shortcut" title={`Press ${shortcutLabel} to search`}>
              {shortcutLabel}
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Suggestions Popover */}
      {isOpen && (
        <div className="dp-smart-search-popover" ref={listRef}>
          {/* Minimum Query Length Hint */}
          {query.trim().length > 0 && query.trim().length < 2 && (
            <div className="dp-smart-search-state-message">
              <span>Type at least 2 characters to search across all academic records...</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="dp-smart-search-state-message is-loading">
              <Loader2 size={18} className="dp-search-spinner" />
              <span>Searching faculty, subjects, rooms, sections & schedules...</span>
            </div>
          )}

          {/* Error Message */}
          {error && !loading && (
            <div className="dp-smart-search-state-message is-error">
              <span>{error}</span>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && results && results.totalCount === 0 && (
            <div className="dp-smart-search-empty-state">
              <Search size={28} className="dp-empty-state-icon" />
              <div className="dp-empty-state-title">No academic records found</div>
              <div className="dp-empty-state-desc">
                No matching faculty, courses, rooms, or sections found for "{query}".
              </div>
              <div className="dp-empty-state-suggestions">
                <span>Try searching:</span>
                <button
                  type="button"
                  className="dp-suggestion-chip"
                  onClick={() => {
                    setQuery('Satheesh');
                    performSearch('Satheesh');
                  }}
                >
                  Satheesh
                </button>
                <button
                  type="button"
                  className="dp-suggestion-chip"
                  onClick={() => {
                    setQuery('B314');
                    performSearch('B314');
                  }}
                >
                  B314
                </button>
                <button
                  type="button"
                  className="dp-suggestion-chip"
                  onClick={() => {
                    setQuery('Database');
                    performSearch('Database');
                  }}
                >
                  Database
                </button>
              </div>
            </div>
          )}

          {/* Categorized Matching Results */}
          {!loading && results && results.totalCount > 0 && (
            <div className="dp-smart-search-results-list">
              {Object.entries(results.categorized).map(([catKey, items]) => {
                if (!Array.isArray(items) || items.length === 0) return null;
                const config = CATEGORY_CONFIG[catKey] || {
                  label: catKey,
                  icon: BookOpen,
                  color: 'var(--dp-primary)',
                  bg: 'var(--dp-primary-soft)'
                };
                const CategoryIcon = config.icon;

                return (
                  <div key={catKey} className="dp-search-category-group">
                    {/* Category Header */}
                    <div className="dp-search-category-header">
                      <div className="dp-search-category-title-left">
                        <CategoryIcon size={14} style={{ color: config.color }} />
                        <span>{config.label}</span>
                      </div>
                      <span className="dp-search-category-count-badge">{items.length}</span>
                    </div>

                    {/* Category Items */}
                    <div className="dp-search-category-items">
                      {items.map((item) => {
                        // Find global index in flatResults
                        const itemIndex = flatResults.findIndex(
                          (r) => r.categoryKey === catKey && r.id === item.id
                        );
                        const isCurrentActive = itemIndex === activeIndex;

                        return (
                          <div
                            key={`${catKey}-${item.id}`}
                            data-index={itemIndex}
                            className={`dp-smart-search-item ${isCurrentActive ? 'is-active' : ''}`}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setActiveIndex(itemIndex)}
                            role="button"
                            tabIndex={0}
                          >
                            <div
                              className="dp-smart-item-icon-box"
                              style={{ backgroundColor: config.bg, color: config.color }}
                            >
                              <CategoryIcon size={16} />
                            </div>

                            <div className="dp-smart-item-details">
                              <div className="dp-smart-item-title-row">
                                <span className="dp-smart-item-title">
                                  {highlightMatch(item.title, query)}
                                </span>
                                {item.badge && (
                                  <span className="dp-smart-item-badge">{item.badge}</span>
                                )}
                              </div>

                              {item.subtitle && (
                                <div className="dp-smart-item-subtitle">
                                  {highlightMatch(item.subtitle, query)}
                                </div>
                              )}

                              {item.meta && (
                                <div className="dp-smart-item-meta">{item.meta}</div>
                              )}
                            </div>

                            <div className="dp-smart-item-action-icon">
                              <ExternalLink size={13} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Navigation Bar */}
          <div className="dp-smart-search-footer">
            <div className="dp-search-footer-hints">
              <span className="dp-footer-key-hint">
                <kbd>↑</kbd>
                <kbd>↓</kbd> navigate
              </span>
              <span className="dp-footer-key-hint">
                <kbd>↵</kbd> select
              </span>
              <span className="dp-footer-key-hint">
                <kbd>Esc</kbd> dismiss
              </span>
            </div>

            {results && results.totalCount > 0 && (
              <button
                type="button"
                className="dp-search-footer-view-all"
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/dean/search?q=${encodeURIComponent(query.trim())}`);
                }}
              >
                <span>View all {results.totalCount} results</span>
                <CornerDownLeft size={12} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSmartSearch;
