import React from "react";
import styles from "./CustomSkeleton.module.css";

interface CustomSkeletonProps {
  type?: "text" | "circle" | "rect";
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const CustomSkeleton: React.FC<CustomSkeletonProps> = ({
  type = "text",
  width,
  height,
  borderRadius,
  className,
  style,
}) => {
  const skeletonStyle: React.CSSProperties = {
    width: width || (type === "circle" ? 40 : "100%"),
    height: height || (type === "text" ? "1rem" : 40),
    borderRadius:
      borderRadius ||
      (type === "circle" ? "50%" : type === "text" ? "20px" : "8px"),
    ...style,
  };

  return (
    <div
      className={`${styles.skeleton} ${styles[type]} ${className || ""}`}
      style={skeletonStyle}
    />
  );
};

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows = 5,
}) => {
  return (
    <div className={styles.tableSkeleton}>
      <div
        className={styles.tableRow}
        style={{ borderBottom: "2px solid rgba(255, 255, 255, 0.05)" }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={styles.tableCell}>
            <CustomSkeleton width="50%" height="1rem" />
          </div>
        ))}
      </div>

      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className={styles.tableCell}>
              <CustomSkeleton
                width={
                  colIndex === 0
                    ? "70%"
                    : colIndex === columns - 1
                      ? "40%"
                      : "85%"
                }
                height="0.85rem"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const TableRowsSkeleton: React.FC<TableSkeletonProps> = ({
  columns,
  rows = 5,
}) => {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <td key={colIndex}>
              <CustomSkeleton
                width={
                  colIndex === 0
                    ? "70%"
                    : colIndex === columns - 1
                      ? "40%"
                      : "85%"
                }
                height="0.85rem"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
};

interface CalendarSkeletonProps {
  rows?: number;
}

export const CalendarSkeleton: React.FC<CalendarSkeletonProps> = ({
  rows = 5,
}) => {
  return (
    <div className={styles.calendarSkeleton}>
      <div className={styles.calendarHeader}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className={styles.headerCell}>
            <CustomSkeleton width="40%" height="0.8rem" />
          </div>
        ))}
      </div>

      <div className={styles.calendarGrid}>
        {Array.from({ length: rows * 7 }).map((_, i) => (
          <div key={i} className={styles.calendarCell}>
            <div className={styles.cellHeader}>
              <CustomSkeleton width="20px" height="20px" borderRadius="4px" />
            </div>
            <div className={styles.cellContent}>
              <CustomSkeleton
                width="60%"
                height="10px"
                style={{ marginBottom: 6 }}
              />
              <CustomSkeleton width="40%" height="10px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ChatSkeleton: React.FC = () => {
  return (
    <div className={styles.chatSkeleton}>
      <div className={styles.chatSidebar}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.convItem}>
            <CustomSkeleton type="circle" width={44} height={44} />
            <div style={{ flex: 1, marginLeft: 12 }}>
              <CustomSkeleton
                width="60%"
                height="12px"
                style={{ marginBottom: 8 }}
              />
              <CustomSkeleton width="80%" height="10px" />
            </div>
          </div>
        ))}
      </div>

      <div className={styles.chatMain}>
        <div className={styles.chatHeader}>
          <CustomSkeleton type="circle" width={40} height={40} />
          <div style={{ flex: 1, marginLeft: 12 }}>
            <CustomSkeleton
              width="120px"
              height="14px"
              style={{ marginBottom: 6 }}
            />
            <CustomSkeleton width="80px" height="10px" />
          </div>
        </div>

        <div className={styles.messageList}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`${styles.messageWrapper} ${i % 2 === 0 ? styles.msgOther : styles.msgOwn}`}
            >
              <div className={styles.msgBubble}>
                <CustomSkeleton
                  width={i === 0 ? "200px" : i === 1 ? "150px" : "250px"}
                  height="20px"
                  borderRadius="12px"
                />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.chatInput}>
          <CustomSkeleton width="100%" height="48px" borderRadius="12px" />
        </div>
      </div>
    </div>
  );
};

export const BoardSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div style={{ flex: 1 }}>
          <CustomSkeleton width="200px" height="2rem" style={{ marginBottom: 8 }} />
          <CustomSkeleton width="300px" height="1rem" />
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <CustomSkeleton width="140px" height="48px" borderRadius="12px" />
          <div style={{ display: 'flex', gap: '16px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <CustomSkeleton key={i} width="200px" height="48px" borderRadius="12px" />
            ))}
          </div>
        </div>
      </div>

      <div className={styles.boardSkeleton}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.boardColumn}>
            <div className={styles.columnHeader}>
              <CustomSkeleton width="40%" height="1.2rem" />
              <CustomSkeleton width="24px" height="24px" borderRadius="12px" />
            </div>
            <div className={styles.cardList}>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className={styles.cardSkeleton}>
                  <CustomSkeleton width="30%" height="12px" style={{ marginBottom: 12 }} />
                  <CustomSkeleton width="100%" height="14px" style={{ marginBottom: 8 }} />
                  <CustomSkeleton width="70%" height="14px" style={{ marginBottom: 16 }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <CustomSkeleton type="circle" width={24} height={24} />
                    <CustomSkeleton width="40px" height="12px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DetailSkeleton: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <CustomSkeleton width="150px" height="32px" borderRadius="8px" />

      <div className="glass-card" style={{ padding: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ flex: 1 }}>
            <CustomSkeleton width="40%" height="2rem" style={{ marginBottom: '12px' }} />
            <div style={{ display: 'flex', gap: '20px' }}>
              <CustomSkeleton width="120px" height="14px" />
              <CustomSkeleton width="120px" height="14px" />
              <CustomSkeleton width="120px" height="14px" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <CustomSkeleton width="100px" height="28px" borderRadius="14px" />
            <CustomSkeleton width="120px" height="36px" borderRadius="10px" />
          </div>
        </div>
        <CustomSkeleton width="100%" height="16px" style={{ marginBottom: '8px' }} />
        <CustomSkeleton width="80%" height="16px" />
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <CustomSkeleton type="circle" width={60} height={60} />
        <div style={{ flex: 1 }}>
          <CustomSkeleton width="200px" height="1.2rem" style={{ marginBottom: '8px' }} />
          <CustomSkeleton width="150px" height="0.9rem" style={{ marginBottom: '4px' }} />
          <CustomSkeleton width="180px" height="0.8rem" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div>
          <CustomSkeleton width="180px" height="1.5rem" style={{ marginBottom: '20px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CustomSkeleton type="circle" width={40} height={40} />
                <div style={{ flex: 1 }}>
                  <CustomSkeleton width="60%" height="14px" style={{ marginBottom: '6px' }} />
                  <CustomSkeleton width="40%" height="10px" />
                </div>
                <CustomSkeleton type="circle" width={20} height={20} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <CustomSkeleton width="180px" height="1.5rem" style={{ marginBottom: '20px' }} />
          <div className="glass-card" style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <CustomSkeleton width="100%" height="2rem" style={{ marginBottom: '8px' }} />
                  <CustomSkeleton width="60%" height="10px" style={{ margin: '0 auto' }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomSkeleton;
