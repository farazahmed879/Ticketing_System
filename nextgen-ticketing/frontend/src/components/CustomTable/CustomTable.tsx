import React, { useEffect, useRef } from "react";
import { TableRowsSkeleton } from "../CustomSkeleton";
import tableStyles from "./CustomTable.module.css";

import type { CustomTableProps } from "../types";

const CustomTable = <T extends { id: string | number }>({
  columns,
  data,
  loading = false,
  emptyMessage = "No data found",
  onRowClick,
  className = "",
  style,
  highlightRowId,
}: CustomTableProps<T>) => {
  const highlightRef = useRef<HTMLTableRowElement>(null);

  // Bring a deep-linked row into view once it renders.
  useEffect(() => {
    if (highlightRowId != null && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightRowId, data]);

  return (
    <div className={`glass-card ${className}`} style={{ padding: 0, ...style }}>
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
            <TableRowsSkeleton columns={columns.length} rows={6} />
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                style={{ textAlign: "center", padding: 40 }}
              >
                <div style={{ color: "var(--text-muted)" }}>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => (
              <tr
                key={item.id}
                ref={item.id === highlightRowId ? highlightRef : undefined}
                className={
                  item.id === highlightRowId ? tableStyles.highlightRow : undefined
                }
                onClick={() => {
                  const selection = window.getSelection();
                  if (selection && selection.toString().trim().length > 0) return;
                  onRowClick?.(item);
                }}
                style={{ cursor: onRowClick ? "pointer" : "default" }}
              >
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    style={{ ...column.style, width: column.width }}
                    className={column.className}
                  >
                    {column.render
                      ? column.render(item, rowIndex)
                      : (item[
                          column.key as keyof T
                        ] as unknown as React.ReactNode)}
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
