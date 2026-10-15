import React, { useState, useEffect } from 'react';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  BookOpen,
  DoorOpen,
  Cpu,
  Tv,
  GraduationCap,
  Layers,
  Calendar,
  ArrowRightLeft,
  Loader2,
  ExternalLink
} from 'lucide-react';
import deanApi from '../../api/dean';

export const DeanSearchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'ALL';

  const { openEntityDrawer } = useOutletContext() || {};
  const navigate = useNavigate();

  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const filterTabs = [
    { id: 'ALL', label: 'All Results' },
    { id: 'FACULTY', label: 'Faculty' },
    { id: 'SUBJECTS', label: 'Subjects' },
    { id: 'CLASSROOMS', label: 'Classrooms' },
    { id: 'LABS', label: 'Labs' },
    { id: 'AUDITORIUMS', label: 'Auditoriums' },
    { id: 'SEMESTERS', label: 'Semesters' },
    { id: 'SECTIONS', label: 'Sections' },
    { id: 'TIMETABLE', label: 'Timetable' },
    { id: 'SUBSTITUTIONS', label: 'Substitutions' }
  ];

  const performSearch = async (searchTerm, cat) => {
    if (!searchTerm || !searchTerm.trim()) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await deanApi.search(searchTerm.trim(), cat);
      setSearchResults(res.data);
    } catch (err) {
      setError(err.message || 'Error occurred while performing search.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, selectedCategory);
    }
  }, [initialQuery, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query, category: selectedCategory });
    performSearch(query, selectedCategory);
  };

  const handleCategorySelect = (catId) => {
    setSelectedCategory(catId);
    setSearchParams({ q: query, category: catId });
    if (query) {
      performSearch(query, catId);
    }
  };

  const allItems = searchResults?.allResults || [];

  return (
    <div className="dp-search-page-container">
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--dp-text)', margin: '0 0 4px 0' }}>
          Department Search
        </h1>
        <p style={{ color: 'var(--dp-secondary)', fontSize: '0.88rem', margin: 0 }}>
          Search across faculty, subjects, classrooms, laboratories, semesters, and schedules.
        </p>
      </div>

      {/* Prominent Search Bar */}
      <div className="dp-global-search-container" style={{ marginBottom: '16px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div className="dp-global-search-bar">
            <Search size={20} className="dp-search-icon" />
            <input
              type="text"
              className="dp-search-input"
              placeholder="Search class, faculty or room..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                type="button"
                className="dp-search-clear-btn"
                onClick={() => {
                  setQuery('');
                  setSearchResults(null);
                }}
              >
                ✕
              </button>
            )}
            <button type="submit" className="dp-btn dp-btn-primary dp-btn-sm" style={{ marginLeft: '10px' }}>
              Search
            </button>
          </div>
        </form>
      </div>

      {/* Category Filter Tabs */}
      <div className="dp-filter-tabs">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`dp-filter-tab-btn ${selectedCategory === tab.id ? 'active' : ''}`}
            onClick={() => handleCategorySelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--dp-secondary)' }}>
          <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--dp-primary)' }} />
          <span>Searching database across collections...</span>
        </div>
      ) : error ? (
        <div className="dp-form-alert error">
          <span>{error}</span>
        </div>
      ) : searchResults ? (
        <div>
          {/* Results Count Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--dp-secondary)' }}>
              Found {allItems.length} results for "{searchResults.query}"
            </span>
          </div>

          {allItems.length === 0 ? (
            <div
              className="dp-empty-state"
              style={{
                background: 'var(--dp-card)',
                border: '1px solid var(--dp-border)',
                borderRadius: 'var(--dp-radius-md)'
              }}
            >
              <Search size={36} className="dp-empty-icon" />
              <div className="dp-empty-title">No records matching "{searchResults.query}"</div>
              <div className="dp-empty-desc">
                Try searching for a different keyword, faculty name, course code, or room number.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px'
              }}
            >
              {allItems.map((item) => (
                <div
                  key={`${item.category}-${item.id}`}
                  style={{
                    background: 'var(--dp-card)',
                    border: '1px solid var(--dp-border)',
                    borderRadius: 'var(--dp-radius-md)',
                    padding: '20px',
                    boxShadow: 'var(--dp-shadow-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div>
                    {/* Header: Category Badge + Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span className="dp-badge-portal">
                        {item.category}
                      </span>
                      {item.badge && (
                        <span className="dp-period-badge" style={{ background: 'var(--dp-surface)', color: 'var(--dp-secondary)' }}>
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--dp-text)' }}>
                      {item.title}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--dp-secondary)', margin: '0 0 10px 0' }}>
                      {item.subtitle}
                    </p>

                    {/* Meta info */}
                    {item.meta && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--dp-muted)', marginBottom: '16px' }}>
                        {item.meta}
                      </div>
                    )}
                  </div>

                  {/* View Details / Navigate Action */}
                  <button
                    type="button"
                    className="dp-btn dp-btn-primary dp-btn-sm"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    onClick={() => {
                      if (item.navigationUrl) {
                        navigate(item.navigationUrl);
                      } else if (openEntityDrawer) {
                        openEntityDrawer({
                          id: item.id,
                          category: item.category,
                          title: item.title,
                          raw: item.raw
                        });
                      }
                    }}
                  >
                    <ExternalLink size={14} />
                    <span>Open Record</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div
          className="dp-empty-state"
          style={{
            background: 'var(--dp-card)',
            border: '1px solid var(--dp-border)',
            borderRadius: 'var(--dp-radius-md)'
          }}
        >
          <Search size={42} className="dp-empty-icon" />
          <div className="dp-empty-title">Instant Academic Directory Search</div>
          <div className="dp-empty-desc">
            Type any faculty member (e.g. "Subu"), subject ("DBMS"), room ("CS-101"), or section to begin.
          </div>
        </div>
      )}
    </div>
  );
};

export default DeanSearchPage;
