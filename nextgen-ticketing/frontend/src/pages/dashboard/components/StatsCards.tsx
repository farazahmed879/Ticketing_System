import React from "react";
import styles from "../Dashboard.module.css";

import type { StatsCardsProps } from "../../../types";

const StatsCards: React.FC<StatsCardsProps> = ({ cards }) => {
  return (
    <div className={styles.statsGrid}>
      {cards.map((card, i) => (
        <div
          key={i}
          className={`${styles.premiumStatCard} glass-card animate-slide-up`}
          style={{
            animationDelay: `${i * 0.1}s`,
            borderLeft: `4px solid ${card.color}`,
          }}
        >
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>{card.label}</span>
            <div className={styles.statValueWrapper}>
              <h2 className={styles.statValue}>{card.value || 0}</h2>
              {/* Optional: Add a small trend indicator or secondary info here if needed */}
            </div>
          </div>

          <div
            className={styles.statIconWrapper}
            style={{
              color: card.color,
              background: `linear-gradient(135deg, ${card.color}20 0%, ${card.color}05 100%)`,
              boxShadow: `0 8px 20px ${card.color}15`,
            }}
          >
            {card.icon}
          </div>

          <div
            className={styles.statGlow}
            style={{
              background: `radial-gradient(circle at center, ${card.color}10 0%, transparent 70%)`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
