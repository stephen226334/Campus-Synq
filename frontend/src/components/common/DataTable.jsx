import React from 'react';
import { Search, Plus, Edit, Trash2 } from 'lucide-react';
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
  onEditClick,
  onDeleteClick,
  emptyTitle = 'No records found',
  emptyDescription = 'Start by adding your first record.',
  emptyActionLabel = null
}) => {
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

      {/* Table Content */}
      {isLoading ? (
        <LoadingSkeleton message={loadingMessage} rows={5} cols={columns.length + 1} />
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
                {columns.map((col, idx) => (
                  <th key={idx} style={{ textAlign: col.align || 'left', width: col.width }}>
                    {col.header}
                  </th>
                ))}
                {(onEditClick || onDeleteClick) && (
                  <th style={{ textAlign: 'right', width: '130px' }}>Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rIdx) => (
                <tr key={row._id || row.id || rIdx}>
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} style={{ textAlign: col.align || 'left' }}>
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                  {(onEditClick || onDeleteClick) && (
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-action-buttons">
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DataTable;
