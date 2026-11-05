import React, { useState } from "react";
import { isToday, isYesterday } from "date-fns";
import { timeAgo } from "../../../utils/helpers";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import styles from "../Dashboard.module.css";
import CustomImage from "../../../components/CustomImage";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface NewHiresSectionProps {
  newHires: any[];
}

const isFresh = (date: string) =>
  isToday(new Date(date)) || isYesterday(new Date(date));

const NewHiresSection: React.FC<NewHiresSectionProps> = ({ newHires }) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  const goToProfile = (hire: any) => {
    setIsExpanded(false);
    navigate(`/profile/${hire.id}`);
  };

  const renderHireCard = (hire: any) => {
    const fresh = isFresh(hire.createdAt);
    return (
      <button
        key={hire.id}
        type="button"
        className={`${styles.personRow} ${fresh ? styles.personRowFresh : ""}`}
        onClick={() => goToProfile(hire)}
      >
        <span className={styles.avatarWrapper}>
          {hire.image ? (
            <CustomImage src={hire.image} alt="" className={styles.hireAvatar} />
          ) : (
            <span className={styles.avatarPlaceholder} aria-hidden="true">
              {hire.fullname?.charAt(0)}
            </span>
          )}
          {fresh && <span className={styles.newBadge}>NEW</span>}
        </span>
        <span className={styles.personInfo}>
          <span className={styles.personNameLine}>
            <span className={styles.hireName}>{hire.fullname}</span>
            {hire.role?.name && (
              <span className={styles.roleChip}>{hire.role.name}</span>
            )}
          </span>
          <span className={styles.personSub}>
            {hire.title || "Team Member"}
            <span className={styles.dot} aria-hidden="true">·</span>
            joined {timeAgo(hire.createdAt)}
          </span>
        </span>
        <CustomIcon
          name="ChevronRight"
          size={16}
          className={styles.rowChevron}
        />
      </button>
    );
  };

  return (
    <>
      <section className={`${styles.section} glass-card`}>
        <SectionHeader
          icon="Sparkles"
          tone="var(--accent-success)"
          title="New Team Members"
          meta={newHires.length > 0 ? `${newHires.length} this week` : undefined}
          onExpand={() => setIsExpanded(true)}
          expandDisabled={newHires.length === 0}
        />
        <div className={styles.personList}>
          {newHires.length > 0 ? (
            newHires.slice(0, 3).map(renderHireCard)
          ) : (
            <EmptyState
              icon="UserPlus"
              title="No new hires this week"
              hint="We're always looking for talented people to join our growing team."
            />
          )}
        </div>
        {newHires.length > 3 && (
          <button
            type="button"
            className={styles.sectionFooterBtn}
            onClick={() => setIsExpanded(true)}
          >
            View all {newHires.length} new hires
            <CustomIcon name="ArrowRight" size={14} />
          </button>
        )}
      </section>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Our Growing Team"
        maxWidth="720px"
      >
        <div className={styles.newHiresGridExpanded}>
          {newHires.length > 0 ? (
            newHires.map(renderHireCard)
          ) : (
            <EmptyState icon="UserPlus" title="No new hires this week" />
          )}
        </div>
      </Modal>
    </>
  );
};

export default NewHiresSection;
