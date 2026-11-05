import React from "react";
import styles from "../Dashboard.module.css";

export interface StatCard {
  label: string;
  value?: number | null;
  icon: React.ReactNode;
  /** Accent colour (CSS value) for the icon tile */
  color: string;
  /** One line of context under the number, e.g. "15% of all tickets" */
  caption?: string;
  onClick?: () => void;
}

const StatsCards: React.FC<{ cards: StatCard[] }> = ({ cards }) => {
  return (
    <div className={styles.statsGrid}>
      {cards.map((card, i) => {
        const body = (
          <>
            <div className={styles.statTop}>
              <span className={styles.statLabel}>{card.label}</span>
              <span
                className={styles.statIconWrapper}
                style={{ "--tone": card.color } as React.CSSProperties}
                aria-hidden="true"
              >
                {card.icon}
              </span>
            </div>
            <div className={styles.statValue}>
              {(card.value ?? 0).toLocaleString()}
            </div>
            {card.caption && (
              <div className={styles.statCaption}>{card.caption}</div>
            )}
          </>
        );
        const className = `${styles.statCard} glass-card animate-slide-up`;
        const style = { animationDelay: `${i * 0.06}s` };
        return card.onClick ? (
          <button
            key={card.label}
            type="button"
            className={`${className} ${styles.statCardClickable}`}
            style={style}
            onClick={card.onClick}
          >
            {body}
          </button>
        ) : (
          <div key={card.label} className={className} style={style}>
            {body}
          </div>
        );
      })}
    </div>
  );
};

export default StatsCards;
