import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import { AnnouncementType } from "../../../utils/constants";
import styles from "../Dashboard.module.css";

import type { AnnouncementSectionProps } from "../../../types";
import CustomImage from "../../../components/CustomImage";

const AnnouncementSection: React.FC<AnnouncementSectionProps> = ({ announcements, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => (
    <>
      <div className={styles.sectionHeader}>
        <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {t("dashboard.announcements")}
        </h2>
        <button
          className={styles.expandSectionBtn}
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <CustomIcon name={isExpanded ? "Minimize2" : "Maximize2"} size={16} />
        </button>
      </div>
      {announcements.length > 0 ? (
        announcements.map((ann) => (
          <div
            key={ann.id}
            className={`${styles.announcementCard} glass-card`}
          >
            <div className={styles.announcementHeader}>
              <CustomIcon
                name={ann.type === AnnouncementType.EVENT ? "Calendar" : "Megaphone"}
                size={16}
              />
              <span>{ann.type}</span>
            </div>
            <h3 className={styles.announcementTitle}>{ann.title}</h3>
            <p className={styles.announcementDesc}>{ann.description}</p>
            <div className={styles.announcementFooter}>
              <div className={styles.announcementAuthor}>
                {ann.author?.image ? (
                  <CustomImage src={ann.author.image} alt="" className={styles.authorAvatar} />
                ) : (
                  <div className={styles.authorAvatar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', fontSize: '10px' }}>
                    {ann.author?.fullname?.charAt(0)}
                  </div>
                )}
                <div className={styles.authorInfo}>
                  <span className={styles.authorName}>{ann.author?.fullname}</span>
                  <span className={styles.authorRole}>{ann.author?.title || ann.author?.role?.name}</span>
                </div>
              </div>
              <div className={styles.announcementDate}>
                <CustomIcon name="Clock" size={14} />
                {formatDistanceToNow(new Date(ann.date), { addSuffix: true })}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.emptyAnnouncements}>
          <div className={styles.emptyIcon}>
            <CustomIcon name="MegaphoneOff" size={24} />
          </div>
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
              No announcements yet
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Stay tuned for important updates and events.
            </p>
          </div>
        </div>
      )}
    </>
  );

  if (isExpanded) {
    return (
      <div className={styles.fullscreenSectionOverlay} onClick={() => setIsExpanded(false)}>
        <div className={styles.fullscreenSectionContent} onClick={(e) => e.stopPropagation()}>
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.announcementContainer}>
      {renderContent()}
    </div>
  );
};

export default AnnouncementSection;
