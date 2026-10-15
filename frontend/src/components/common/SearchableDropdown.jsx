import React, { useState, useEffect, useRef, useId } from 'react';
import { Search, ChevronDown, X, Loader2, Check, AlertCircle } from 'lucide-react';

/**
 * Campus Synq Shared Searchable Dropdown
 * 
 * Supports:
 * - Dynamic options from API responses
 * - Searching by label, subtitle, badge, or custom searchTerms
 * - Grouped options (e.g. Classrooms, Labs, Auditoriums, Faculty)
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Clear button
 * - Loading, empty, and error states
 * - WAI-ARIA combobox accessibility
 * - Theme-aware Campus Synq styling
 */
export const SearchableDropdown = ({
  id: propId,
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  loading = false,
  loadingText = 'Loading options...',
  error = null,
  disabled = false,
  clearable = true,
  icon: IconComponent = null,
  required = false,
  className = '',
  style = {},
  autoFocus = false
}) => {
  const generatedId = useId();
  const componentId = propId || `cs-dropdown-${generatedId}`;
  const listboxId = `${componentId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listboxRef = useRef(null);

  // Find the selected option object
  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || null;

  // Sync display search query when value changes externally or when closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(selectedOption ? selectedOption.label : '');
    }
  }, [value, selectedOption, isOpen]);

  // Filter options based on user search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery.trim() || (!isOpen && selectedOption && searchQuery === selectedOption.label)) {
      return options;
    }
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => {
      const matchLabel = opt.label?.toLowerCase().includes(q);
      const matchSubLabel = opt.subLabel?.toLowerCase().includes(q);
      const matchBadge = opt.badge?.toLowerCase().includes(q);
      const matchGroup = opt.group?.toLowerCase().includes(q);
      const matchSearchTerms = opt.searchTerms?.toLowerCase().includes(q);
      return matchLabel || matchSubLabel || matchBadge || matchGroup || matchSearchTerms;
    });
  }, [options, searchQuery, isOpen, selectedOption]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery(selectedOption ? selectedOption.label : '');
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedOption]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && listboxRef.current) {
      const itemElem = listboxRef.current.querySelector(`[data-index="${highlightedIndex}"]`);
      if (itemElem) {
        itemElem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleOpen = () => {
    if (disabled) return;
    setIsOpen(true);
    // If opening, allow user to edit/search immediately
    if (selectedOption) {
      setSearchQuery('');
    }
    setHighlightedIndex(0);
  };

  const handleSelect = (option) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setSearchQuery(option.label);
    setIsOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('', null);
    setSearchQuery('');
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter') {
        e.preventDefault();
        handleOpen();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
        } else if (filteredOptions.length === 1) {
          handleSelect(filteredOptions[0]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchQuery(selectedOption ? selectedOption.label : '');
        setHighlightedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchQuery(selectedOption ? selectedOption.label : '');
        break;
      default:
        break;
    }
  };

  // Check if options have groups
  const hasGroups = React.useMemo(() => {
    return filteredOptions.some((opt) => !!opt.group);
  }, [filteredOptions]);

  // Group items if needed
  const groupedItems = React.useMemo(() => {
    if (!hasGroups) return null;
    const groups = {};
    filteredOptions.forEach((opt, idx) => {
      const g = opt.group || 'Other';
      if (!groups[g]) groups[g] = [];
      groups[g].push({ option: opt, globalIndex: idx });
    });
    return groups;
  }, [filteredOptions, hasGroups]);

  return (
    <div
      ref={containerRef}
      className={`cs-dropdown-container ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'is-open' : ''}`}
      style={style}
    >
      {label && (
        <label
          htmlFor={componentId}
          className="cs-dropdown-label"
        >
          {label} {required && <span className="cs-dropdown-required">*</span>}
        </label>
      )}

      <div className="cs-dropdown-control-wrapper">
        <div className="cs-dropdown-input-box" onClick={handleOpen}>
          {IconComponent && (
            <span className="cs-dropdown-leading-icon" aria-hidden="true">
              {React.isValidElement(IconComponent) ? IconComponent : <IconComponent size={16} />}
            </span>
          )}

          <input
            ref={inputRef}
            id={componentId}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            aria-controls={listboxId}
            aria-activedescendant={
              isOpen && highlightedIndex >= 0 ? `${componentId}-opt-${highlightedIndex}` : undefined
            }
            className="cs-dropdown-input"
            placeholder={selectedOption && !isOpen ? selectedOption.label : placeholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
              setHighlightedIndex(0);
            }}
            onFocus={handleOpen}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            autoComplete="off"
            autoFocus={autoFocus}
          />

          <div className="cs-dropdown-trailing-actions">
            {clearable && selectedOption && !disabled && (
              <button
                type="button"
                className="cs-dropdown-clear-btn"
                onClick={handleClear}
                title="Clear selection"
                aria-label="Clear selection"
              >
                <X size={14} />
              </button>
            )}

            {loading ? (
              <Loader2 size={16} className="cs-dropdown-spinner animate-spin" />
            ) : (
              <button
                type="button"
                className="cs-dropdown-arrow-btn"
                tabIndex={-1}
                aria-hidden="true"
              >
                <ChevronDown size={16} className={`cs-dropdown-chevron ${isOpen ? 'rotate' : ''}`} />
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Menu Popover */}
        {isOpen && (
          <div
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            className="cs-dropdown-popover"
            tabIndex={-1}
          >
            {loading && (
              <div className="cs-dropdown-state-row">
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>{loadingText}</span>
              </div>
            )}

            {!loading && error && (
              <div className="cs-dropdown-state-row error">
                <AlertCircle size={16} />
                <span>{typeof error === 'string' ? error : 'Failed to load options'}</span>
              </div>
            )}

            {!loading && !error && filteredOptions.length === 0 && (
              <div className="cs-dropdown-state-row empty">
                <span>No matches found {searchQuery ? `for "${searchQuery}"` : ''}</span>
              </div>
            )}

            {!loading && !error && filteredOptions.length > 0 && !hasGroups && (
              <div className="cs-dropdown-options-list">
                {filteredOptions.map((opt, idx) => {
                  const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                  const isHighlighted = highlightedIndex === idx;

                  return (
                    <div
                      key={String(opt.value) || idx}
                      id={`${componentId}-opt-${idx}`}
                      data-index={idx}
                      role="option"
                      aria-selected={isSelected}
                      className={`cs-dropdown-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${opt.disabled ? 'disabled' : ''}`}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                    >
                      <div className="cs-dropdown-option-content">
                        <div className="cs-dropdown-option-header">
                          <span className="cs-dropdown-option-label">{opt.label}</span>
                          {opt.badge && (
                            <span className="cs-dropdown-option-badge">{opt.badge}</span>
                          )}
                        </div>
                        {opt.subLabel && (
                          <div className="cs-dropdown-option-sublabel">{opt.subLabel}</div>
                        )}
                      </div>

                      {isSelected && (
                        <Check size={16} className="cs-dropdown-check-icon" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && filteredOptions.length > 0 && hasGroups && (
              <div className="cs-dropdown-options-list">
                {Object.entries(groupedItems).map(([groupName, items]) => (
                  <div key={groupName} className="cs-dropdown-group">
                    <div className="cs-dropdown-group-header">{groupName}</div>
                    {items.map(({ option: opt, globalIndex: idx }) => {
                      const isSelected = selectedOption && String(selectedOption.value) === String(opt.value);
                      const isHighlighted = highlightedIndex === idx;

                      return (
                        <div
                          key={String(opt.value) || idx}
                          id={`${componentId}-opt-${idx}`}
                          data-index={idx}
                          role="option"
                          aria-selected={isSelected}
                          className={`cs-dropdown-option ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${opt.disabled ? 'disabled' : ''}`}
                          onClick={() => handleSelect(opt)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                          <div className="cs-dropdown-option-content">
                            <div className="cs-dropdown-option-header">
                              <span className="cs-dropdown-option-label">{opt.label}</span>
                              {opt.badge && (
                                <span className="cs-dropdown-option-badge">{opt.badge}</span>
                              )}
                            </div>
                            {opt.subLabel && (
                              <div className="cs-dropdown-option-sublabel">{opt.subLabel}</div>
                            )}
                          </div>

                          {isSelected && (
                            <Check size={16} className="cs-dropdown-check-icon" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableDropdown;
