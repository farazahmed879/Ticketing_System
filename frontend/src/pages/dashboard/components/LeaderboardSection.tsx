import React, { useEffect, useState } from "react";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import styles from "../Dashboard.module.css";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

// Gold / silver / bronze for the top three.
const MEDAL = ["#f5b301", "#9aa4b2", "#c9824a"];

const LeaderboardPreview: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    api
      .get(API_ROUTES.CANDIDATES.LEADERBOARD)
      .then((res) => setData(res.data.leaderboard || []))
      .catch((err) => console.error("Failed to load leaderboard", err))
      .finally(() => setLoading(false));
  }, []);

  const renderList = (isOverlay = false) => {
    if (loading) {
      return (
        <div className={styles.rankList} aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.rankSkeleton} />
          ))}
        </div>
      );
    }
    const list = isOverlay ? data : data.slice(0, 5);
    if (list.length === 0) {
      return (
        <EmptyState
          icon="Trophy"
          title="No rankings yet"
          hint="Recruiter ratings will appear here."
        />
      );
    }
    return (
      <ol className={styles.rankList}>
        {list.map((item, index) => (
          <li key={`${item.name}-${index}`} className={styles.rankRow}>
            <span
              className={`${styles.rankBadge} ${index < 3 ? styles.rankBadgeTop : ""}`}
              style={
                index < 3
                  ? ({ "--tone": MEDAL[index] } as React.CSSProperties)
                  : undefined
              }
            >
              {index + 1}
            </span>
            <span className={styles.rankName}>{item.name}</span>
            <span className={styles.rankScore}>
              <CustomIcon name="Star" size={13} fill="currentColor" />
              {Number(item.averageRating ?? 0).toFixed(1)}
            </span>
          </li>
        ))}
      </ol>
    );
  };

  return (
    <>
      <section className={`${styles.section} glass-card`}>
        <SectionHeader
          icon="Trophy"
          tone="var(--accent-warning)"
          title="Top Recruiters"
          meta="avg. rating"
          onExpand={() => setIsExpanded(true)}
          expandDisabled={!loading && data.length === 0}
        />
        {renderList(false)}
      </section>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Top Recruiters"
        maxWidth="720px"
      >
        <div style={{ paddingBottom: 16 }}>{renderList(true)}</div>
      </Modal>
    </>
  );
};

export default LeaderboardPreview;
