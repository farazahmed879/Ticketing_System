import React, { useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import Modal from "../../../components/Modal";
import styles from "../Dashboard.module.css";
import CustomImage from "../../../components/CustomImage";

interface ReviewsSectionProps {
  reviews: any[];
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderReviewCard = (review: any) => (
    <div
      key={review.id}
      className={`${styles.premiumReviewCard} glass-card`}
    >
      <div className={styles.quoteIconWrapper}>
        <CustomIcon name="Quote" size={16} />
      </div>

      <div className={styles.reviewContent}>
        <h4 className={styles.reviewTitle}>{review.title}</h4>
        <p className={styles.reviewText}>{review.description}</p>
      </div>

      <div className={styles.reviewDivider} />

      <div className={styles.reviewerSection}>
        <div className={styles.reviewerAvatarWrapper}>
          {review.author?.image ? (
            <CustomImage
              src={review.author.image}
              alt={review.author.fullname}
              className={styles.reviewerAvatar}
            />
          ) : (
            <div className={styles.reviewerAvatarPlaceholder}>
              {review.author?.fullname?.charAt(0)}
            </div>
          )}
          <div className={styles.verifiedBadge}>
            <CustomIcon
              name="CheckCircle2"
              size={8}
              fill="var(--accent-success)"
            />
          </div>
        </div>

        <div className={styles.reviewerMeta}>
          <div className={styles.reviewerTop}>
            <h5 className={styles.reviewerName}>
              {review.author?.fullname}
            </h5>
            <div className={styles.reviewStars}>
              {Array.from({ length: review.rating || 5 }).map(
                (_, i) => (
                  <CustomIcon
                    key={i}
                    name="Star"
                    size={8}
                    className={styles.premiumStar}
                    fill="currentColor"
                  />
                ),
              )}
            </div>
          </div>
          <span className={styles.reviewerRole}>
            {review.author?.title || "Valued Client"}
          </span>
        </div>
      </div>
    </div>
  );

  const renderList = (limit?: number) => {
    const list = limit ? reviews.slice(0, limit) : reviews;
    return list.length > 0 ? (
      list.map(renderReviewCard)
    ) : (
      <div className={styles.emptyReviews}>
        <CustomIcon name="MessageSquare" size={32} opacity={0.3} />
        <p>No reviews yet. Your great work will be recognized soon!</p>
      </div>
    );
  };

  return (
    <>
      <div className={`${styles.reviewsSection} glass-card`}>
        <div className={styles.welcomeHeader}>
          <div
            className={styles.welcomeTitle}
            style={{ color: "var(--accent-warning)" }}
          >
            <CustomIcon name="Quote" size={24} />
            <h2>Client Reviews</h2>
          </div>
          <button
            className={styles.expandSectionBtn}
            onClick={() => setIsExpanded(true)}
            title="Expand"
            disabled={reviews.length === 0}
          >
            <CustomIcon name="Maximize2" size={16} />
          </button>
        </div>
        <div className={styles.reviewsList}>{renderList(3)}</div>
      </div>

      <Modal
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
        title="Client Reviews"
        maxWidth="720px"
      >
        <div className={styles.reviewsList} style={{ paddingBottom: 16 }}>
          {renderList()}
        </div>
      </Modal>
    </>
  );
};

export default ReviewsSection;
