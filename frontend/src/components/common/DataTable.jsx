import React, { useRef, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, CheckSquare, X, Eye } from 'lucide-react';
import EmptyState from './EmptyState';
import LoadingSkeleton from './LoadingSkeleton';

export const DataTable = ({
  title,
  subtitle,
  data = [],
  columns = [],
  isLoading = false,
  loadingMessage = 'Loading records...',
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search records...',
  filters = null,
  onAddClick,
  addLabel = 'Add New',
  onViewClick,
  onEditClick,
  onDeleteClick,
  emptyTitle = 'No records found',
  emptyDescription = 'Start by adding your first record.',
  emptyActionLabel = null,
  // Multi-selection & bulk actions
  selectable = false,
  selectedIds = [],
  onSelectRow = null,
  onSelectAll = null,
  onClearSelection = null,
  onBulkDelete = null,
  bulkDeleteLabel = 'Delete Selected',
  isBulkDeleting = false
}) => {
  const headerCheckboxRef = useRef(null);

  const isAllSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row._id || row.id));
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected;
    }
  }, [isSomeSelected]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      if (onClearSelection) onClearSelection();
    } else {
      const visibleIds = data.map((row) => row._id || row.id).filter(Boolean);
      if (onSelectAll) onSelectAll(visibleIds);
    }
  };

  return (
    <div className="data-table-container card">
      {/* Table Toolbar */}
      <div className="table-toolbar">
        <div className="table-header-titles">
          <h2 className="table-title">{title}</h2>
          {subtitle && <p className="table-subtitle">{subtitle}</p>}
        </div>

        <div className="table-actions-bar">
          {/* Search box */}
          {onSearchChange && (
            <div className="table-search-box">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="table-search-input"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                id="input-table-search"
              />
            </div>
          )}

          {/* Optional Filter Controls */}
          {filters && <div className="table-filters-group">{filters}</div>}

          {/* Add Record Button */}
          {onAddClick && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onAddClick}
              id="btn-add-record"
            >
              <Plus size={16} />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectable && selectedIds.length > 0 && (
        <div className="timetable-bulk-toolbar" role="toolbar" aria-label="Bulk actions toolbar">
          <div className="bulk-toolbar-left">
            <span className="bulk-toolbar-count-badge">
              <CheckSquare size={16} />
              <strong>{selectedIds.length}</strong> selected
            </span>
            <span className="bulk-toolbar-divider">|</span>
            <button
              type="button"
              className="bulk-toolbar-btn"
              onClick={() => onSelectAll && onSelectAll(data.map((r) => r._id || r.id).filter(Boolean))}
              id="btn-bulk-select-all"
            >
              Select All Visible ({data.length})
            </button>
            <button
              type="button"
              className="bulk-toolbar-btn"
              onClick={onClearSelection}
              id="btn-bulk-clear-selection"
            >
              <X size={14} style={{ marginRight: '4px' }} />
              Clear Selection
            </button>
          </div>
          <div className="bulk-toolbar-right">
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onBulkDelete && onBulkDelete(selectedIds)}
              disabled={isBulkDeleting}
              id="btn-bulk-delete"
            >
              <Trash2 size={15} />
              <span>{isBulkDeleting ? 'Deleting...' : bulkDeleteLabel}</span>
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      {isLoading ? (
        <LoadingSkeleton message={loadingMessage} rows={5} cols={columns.length + (selectable ? 2 : 1)} />
      ) : data.length === 0 ? (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={emptyActionLabel || addLabel}
          onAction={onAddClick}
        />
      ) : (
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {selectable && (
                  <th style={{ width: '44px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      aria-label="Select all displayed rows"
                      id="checkbox-select-all-header"
                    />
                  </th>
                )}
                {columns.map((col, idx) => (
                  <th key={idx} style={{ textAlign: col.align || 'left', width: col.width }}>
                    {col.header}
                  </th>
                ))}
                {(onEditClick || onDeleteClick || onViewClick) && (
                  <th style={{ textAlign: 'right', width: onViewClick ? '180px' : '130px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rIdx) => {
                const rowId = row._id || row.id || rIdx;
                const isSelected = selectedIds.includes(rowId);
                return (
                  <tr key={rowId} className={isSelected ? 'timetable-row-selected' : ''}>
                    {selectable && (
                      <td style={{ width: '44px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(rowId, row)}
                          aria-label={`Select ${row.name || row.roomNumber || row.fullName || 'item'}`}
                          id={`checkbox-row-${rowId}`}
                        />
                      </td>
                    )}
                    {columns.map((col, cIdx) => (
                      <td key={cIdx} style={{ textAlign: col.align || 'left' }}>
                        {col.render ? col.render(row) : row[col.accessor]}
                      </td>
                    ))}
                    {(onEditClick || onDeleteClick || onViewClick) && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="row-action-buttons">
                          {onViewClick && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => onViewClick(row)}
                              title="View Details"
                              aria-label={`View ${row.fullName || row.name || 'item'}`}
                            >
                              <Eye size={15} />
                              <span>View</span>
                            </button>
                          )}
                          {onEditClick && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => onEditClick(row)}
                              title="Edit Record"
                              aria-label={`Edit ${row.name || row.roomNumber || row.labNumber || row.auditoriumNumber || 'item'}`}
                            >
                              <Edit size={15} />
                              <span>Edit</span>
                            </button>
                          )}
                          {onDeleteClick && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-danger"
                              onClick={() => onDeleteClick(row)}
                              title="Delete Record"
                              aria-label={`Delete ${row.name || row.roomNumber || row.labNumber || row.auditoriumNumber || 'item'}`}
                            >
                              <Trash2 size={15} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataTable;
