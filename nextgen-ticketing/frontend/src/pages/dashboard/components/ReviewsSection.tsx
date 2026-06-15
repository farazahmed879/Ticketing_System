import React, { useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

interface ReviewsSectionProps {
  reviews: any[];
}

const ReviewsSection: React.FC<ReviewsSectionProps> = ({ reviews }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderContent = () => (
    <>
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
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? "Collapse" : "Expand"}
        >
          <CustomIcon name={isExpanded ? "Minimize2" : "Maximize2"} size={16} />
        </button>
      </div>
      <div className={styles.reviewsList}>
        {reviews.length > 0 ? (
          reviews.map((review) => (
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
                    <img
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
          ))
        ) : (
          <div className={styles.emptyReviews}>
            <CustomIcon name="MessageSquare" size={32} opacity={0.3} />
            <p>No reviews yet. Your great work will be recognized soon!</p>
          </div>
        )}
      </div>
    </>
  );

  if (isExpanded) {
    return (
      <div
        className={styles.fullscreenSectionOverlay}
        onClick={() => setIsExpanded(false)}
      >
        <div
          className={styles.fullscreenSectionContent}
          onClick={(e) => e.stopPropagation()}
        >
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.reviewsSection} glass-card`}>
      {renderContent()}
    </div>
  );
};

export default ReviewsSection;
