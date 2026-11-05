import React, { useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import { FormattedTaskDescription } from "../../timesheet/components/TaskDescriptionEditor";
import styles from "../Dashboard.module.css";
import CustomImage from "../../../components/CustomImage";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface ReviewsSectionProps {
  reviews: any[];
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderReviewCard = (review: any, clamp: boolean) => {
    const rating = Math.max(0, Math.min(5, Math.round(review.rating || 5)));
    return (
      <article key={review.id} className={styles.feedItem}>
        <div className={styles.feedItemTop}>
          <div
            className={styles.reviewStars}
            role="img"
            aria-label={`${rating} out of 5 stars`}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <CustomIcon
                key={i}
                name="Star"
                size={13}
                fill={i < rating ? "currentColor" : "none"}
                className={i < rating ? undefined : styles.starOff}
              />
            ))}
          </div>
          <CustomIcon name="Quote" size={16} className={styles.reviewQuote} />
        </div>
        <h3 className={styles.feedTitle}>{review.title}</h3>
        <FormattedTaskDescription
          content={review.description}
          className={`${styles.feedText} ${clamp ? styles.clamp3 : ""}`}
        />
        <div className={styles.feedAuthor}>
          {review.author?.image ? (
            <CustomImage
              src={review.author.image}
              alt=""
              className={styles.miniAvatar}
            />
          ) : (
            <span
              className={styles.miniAvatar}
              style={{ "--tone": "var(--accent-warning)" } as React.CSSProperties}
              aria-hidden="true"
            >
              {review.author?.fullname?.charAt(0)}
            </span>
          )}
          <span className={styles.feedAuthorName}>{review.author?.fullname}</span>
          <span className={styles.feedAuthorRole}>
            · {review.author?.title || "Valued Client"}
          </span>
        </div>
      </article>
    );
  };

  const renderList = (limit?: number) => {
    const list = limit ? reviews.slice(0, limit) : reviews;
    return list.length > 0 ? (
      list.map((r) => renderReviewCard(r, !!limit))
    ) : (
      <EmptyState
        icon="MessageSquareQuote"
        title="No client reviews yet"
        hint="Your great work will be recognized soon!"
      />
    );
  };

  return (
    <>
      <section className={`${styles.section} glass-card`}>
        <SectionHeader
          icon="Quote"
          tone="var(--accent-warning)"
          title="Client Reviews"
          meta={reviews.length > 0 ? reviews.length : undefined}
          onExpand={() => setIsExpanded(true)}
          expandDisabled={reviews.length === 0}
        />
        <div className={styles.feedList}>{renderList(3)}</div>
      </section>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Client Reviews"
        maxWidth="720px"
      >
        <div className={styles.feedList} style={{ paddingBottom: 16 }}>
          {renderList()}
        </div>
      </Modal>
    </>
  );
};

export default ReviewsSection;
