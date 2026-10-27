import React, { useState } from "react";
import { timeAgo } from "../../../utils/helpers";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import { AnnouncementType } from "../../../utils/constants";
import styles from "../Dashboard.module.css";

import type { AnnouncementSectionProps } from "../../../types";
import CustomImage from "../../../components/CustomImage";

const AnnouncementSection: React.FC<AnnouncementSectionProps> = ({ announcements, t }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderAnnouncementCard = (ann: any) => (
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
          {timeAgo(ann.createdAt || ann.date)}
        </div>
      </div>
    </div>
  );

  const renderList = (limit?: number) => {
    const list = limit ? announcements.slice(0, limit) : announcements;
    return list.length > 0 ? (
      list.map(renderAnnouncementCard)
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
    );
  };

  return (
    <>
      <div className={styles.announcementContainer}>
        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
            {t("dashboard.announcements")}
          </h2>
          <button
            className={styles.expandSectionBtn}
            onClick={() => setIsExpanded(true)}
            title="Expand"
            disabled={announcements.length === 0}
          >
            <CustomIcon name="Maximize2" size={16} />
          </button>
        </div>
        {renderList(3)}
      </div>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={t("dashboard.announcements")}
        maxWidth="720px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: 16 }}>
          {renderList()}
        </div>
      </Modal>
    </>
  );
};

export default AnnouncementSection;
