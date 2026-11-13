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
  renderExpandedRow,
  isRowExpanded,
}: CustomTableProps<T>) => {
  const highlightRef = useRef<HTMLTableRowElement>(null);

  // Bring a deep-linked row into view once it renders.
  useEffect(() => {
    if (highlightRowId != null && highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [highlightRowId, data]);

  // Phones: rows render as stacked cards (see CustomTable.module.css). Each
  // cell carries its header as data-label; the first column becomes the card
  // title and an "Actions" column becomes the card's footer bar.
  const isActionsColumn = (header: string, key: unknown) =>
    header.trim().toLowerCase() === "actions" ||
    String(key).toLowerCase() === "actions";

  const getCellClassName = (
    colIndex: number,
    header: string,
    key: unknown,
    extra?: string,
  ) =>
    [
      colIndex === 0 ? tableStyles.primaryCell : "",
      isActionsColumn(header, key) ? tableStyles.actionsCell : "",
      extra ?? "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div
      className={`glass-card ${tableStyles.wrapper} ${className}`}
      style={{ padding: 0, ...style }}
    >
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
            <tr className={tableStyles.emptyRow}>
              <td
                colSpan={columns.length}
                style={{ textAlign: "center", padding: 40 }}
              >
                <div style={{ color: "var(--text-muted)" }}>{emptyMessage}</div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIndex) => {
              const isExpanded = isRowExpanded ? isRowExpanded(item, rowIndex) : false;
              return (
                <React.Fragment key={item.id}>
                  <tr
                    ref={item.id === highlightRowId ? highlightRef : undefined}
                    className={[
                      tableStyles.dataRow,
                      item.id === highlightRowId ? tableStyles.highlightRow : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
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
                        className={getCellClassName(
                          colIndex,
                          column.header,
                          column.key,
                          column.className,
                        )}
                        data-label={column.header || undefined}
                      >
                        {column.render
                          ? column.render(item, rowIndex)
                          : (item[
                              column.key as keyof T
                            ] as unknown as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && renderExpandedRow && (
                    <tr className={tableStyles.expandedRow}>
                      <td colSpan={columns.length} style={{ padding: 0 }}>
                        {renderExpandedRow(item, rowIndex)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CustomTable;
