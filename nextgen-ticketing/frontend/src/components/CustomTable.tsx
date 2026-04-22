import React from 'react';
import tableStyles from '../pages/dashboard/Dashboard.module.css';

import type { CustomTableProps } from './types';

const CustomTable = <T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found',
  loadingMessage = 'Loading data...',
  onRowClick,
  className = '',
}: CustomTableProps<T>) => {
  return (
    <div className={`glass-card ${className}`}>
      <table className={tableStyles.table}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} style={column.style} className={column.className}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ color: 'var(--text-muted)' }}>{loadingMessage}</div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ color: 'var(--text-muted)' }}>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr 
                key={item.id} 
                onClick={() => onRowClick?.(item)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((column, index) => (
                  <td key={index} style={column.style} className={column.className}>
                    {column.render 
                      ? column.render(item) 
                      : (item[column.key as keyof T] as unknown as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CustomTable;
