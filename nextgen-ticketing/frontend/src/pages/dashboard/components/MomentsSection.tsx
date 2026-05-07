import React from "react";
import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

interface MomentsSectionProps {
  moments: any[];
}

const MomentsSection: React.FC<MomentsSectionProps> = ({ moments }) => {
  return (
    <div className={`${styles.momentsSection} glass-card`}>
      <div className={styles.welcomeHeader}>
        <div className={styles.welcomeTitle} style={{ color: 'var(--accent-secondary)' }}>
          <CustomIcon name="Heart" size={24} />
          <h2>Moments of Joy</h2>
        </div>
      </div>
      <div className={styles.momentsList}>
        {moments.length > 0 ? (
          moments.map((mom) => (
            <div key={mom.id} className={styles.momentCard}>
              <div className={styles.momentHeader}>
                <div className={styles.momentAuthor}>
                  {mom.author?.image ? (
                    <img src={mom.author.image} alt="" className={styles.momentAvatar} />
                  ) : (
                    <div className={styles.momentAvatar} style={{ background: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '10px' }}>
                      {mom.author?.fullname?.charAt(0)}
                    </div>
                  )}
                  <span className={styles.momentAuthorName}>{mom.author?.fullname}</span>
                </div>
                <span className={styles.momentDate}>{formatDistanceToNow(new Date(mom.date), { addSuffix: true })}</span>
              </div>
              <h4 className={styles.momentTitle}>{mom.title}</h4>
              <p className={styles.momentText}>{mom.description}</p>
            </div>
          ))
        ) : (
          <div className={styles.emptyMoments}>
            <div className={styles.sparklesIcon}>✨</div>
            <p>Share some fun moments with the team!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MomentsSection;
