import React, { useState } from "react";
import { timeAgo } from "../../../utils/helpers";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import { AnnouncementType } from "../../../utils/constants";
import { FormattedTaskDescription } from "../../timesheet/components/TaskDescriptionEditor";
import styles from "../Dashboard.module.css";
import type { AnnouncementSectionProps } from "../../../types";
import CustomImage from "../../../components/CustomImage";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

// Pill colour + icon per announcement type.
const TYPE_STYLE: Record<string, { tone: string; icon: string; label: string }> = {
  [AnnouncementType.EVENT]: { tone: "var(--accent-secondary)", icon: "Calendar", label: "Event" },
  [AnnouncementType.IMPORTANT]: { tone: "var(--accent-danger)", icon: "AlertTriangle", label: "Important" },
  [AnnouncementType.INFO]: { tone: "var(--accent-primary)", icon: "Info", label: "Info" },
};
const typeStyle = (type: string) =>
  TYPE_STYLE[type] ?? { tone: "var(--accent-primary)", icon: "Megaphone", label: type };

const AnnouncementSection: React.FC<AnnouncementSectionProps> = ({
  announcements,
  t,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderAnnouncementCard = (ann: any, clamp: boolean) => {
    const ts = typeStyle(ann.type);
    return (
      <article key={ann.id} className={styles.feedItem}>
        <div className={styles.feedItemTop}>
          <span
            className={styles.typePill}
            style={{ "--tone": ts.tone } as React.CSSProperties}
          >
            <CustomIcon name={ts.icon} size={12} />
            {ts.label}
          </span>
          <span className={styles.feedTime}>
            {timeAgo(ann.createdAt || ann.date)}
          </span>
        </div>
        <h3 className={styles.feedTitle}>{ann.title}</h3>
        <FormattedTaskDescription
          content={ann.description}
          className={`${styles.feedText} ${clamp ? styles.clamp3 : ""}`}
        />
        <div className={styles.feedAuthor}>
          {ann.author?.image ? (
            <CustomImage
              src={ann.author.image}
              alt=""
              className={styles.miniAvatar}
            />
          ) : (
            <span className={styles.miniAvatar} aria-hidden="true">
              {ann.author?.fullname?.charAt(0)}
            </span>
          )}
          <span className={styles.feedAuthorName}>{ann.author?.fullname}</span>
          {(ann.author?.title || ann.author?.role?.name) && (
            <span className={styles.feedAuthorRole}>
              · {ann.author?.title || ann.author?.role?.name}
            </span>
          )}
        </div>
      </article>
    );
  };

  const renderList = (limit?: number) => {
    const list = limit ? announcements.slice(0, limit) : announcements;
    return list.length > 0 ? (
      list.map((ann) => renderAnnouncementCard(ann, !!limit))
    ) : (
      <EmptyState
        icon="MegaphoneOff"
        title="No announcements yet"
        hint="Stay tuned for important updates and events."
      />
    );
  };

  return (
    <>
      <section className={`${styles.section} glass-card`}>
        <SectionHeader
          icon="Megaphone"
          tone="var(--accent-primary)"
          title={t("dashboard.announcements")}
          meta={announcements.length > 0 ? announcements.length : undefined}
          onExpand={() => setIsExpanded(true)}
          expandDisabled={announcements.length === 0}
        />
        <div className={styles.feedList}>{renderList(3)}</div>
      </section>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title={t("dashboard.announcements")}
        maxWidth="720px"
      >
        <div className={styles.feedList} style={{ paddingBottom: 16 }}>
          {renderList()}
        </div>
      </Modal>
    </>
  );
};

export default AnnouncementSection;
