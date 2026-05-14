import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { useAuth } from "../../context/AuthContext";
import styles from "./InterviewDetail.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import {
  InterviewStatus,
  Recommendation,
  UIMessages,
} from "../../utils/constants";

import type { Interview, InterviewFeedback } from "../../types";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomSelect from "../../components/CustomSelect";
import CustomTextArea from "../../components/CustomTextArea";
import { DetailSkeleton } from "../../components/CustomSkeleton/CustomSkeleton";

const statusBadgeVariant = (status: string) => {
  switch (status) {
    case InterviewStatus.SCHEDULED:
      return "info" as const;
    case InterviewStatus.COMPLETED:
      return "success" as const;
    case InterviewStatus.CANCELLED:
      return "danger" as const;
    default:
      return "neutral" as const;
  }
};

const StarRating: React.FC<{
  value: number;
  onChange: (val: number) => void;
  label: string;
}> = ({ value, onChange, label }) => (
  <div className={styles.ratingItem}>
    <span className={styles.ratingLabel}>{label}</span>
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map((star) => (
        <CustomButton
          key={star}
          type="button"
          variant="ghost"
          className={`${styles.star} ${star <= value ? styles.starFilled : ""}`}
          onClick={() => onChange(star)}
          icon={<CustomIcon name="Star" size={22} />}
        />
      ))}
    </div>
  </div>
);

const DisplayStars: React.FC<{ value: number }> = ({ value }) => (
  <div className={styles.stars}>
    {[1, 2, 3, 4, 5].map((star) => (
      <span
        key={star}
        className={`${styles.star} ${star <= value ? styles.starFilled : ""}`}
        style={{ cursor: "default" }}
      >
        <CustomIcon name="Star" size={14} />
      </span>
    ))}
  </div>
);

const InterviewDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showNotification, setIsLoading } = useNotification();

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback form
  const [communicationRating, setCommunicationRating] = useState(0);
  const [technicalRating, setTechnicalRating] = useState(0);
  const [leadershipRating, setLeadershipRating] = useState(0);
  const [comments, setComments] = useState("");
  const [recommendation, setRecommendation] = useState("Neutral");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchInterview = async () => {
    try {
      const res = await api.get(API_ROUTES.INTERVIEWS.BY_ID(id!));
      setInterview(res.data.interview);
    } catch (err) {
      console.error("Failed to fetch interview", err);
      showNotification("error", "Failed to load interview details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterview();
  }, [id]);

  const isPanelMember = interview?.panelMembers.some(
    (pm) => pm.user.id === user?.id,
  );

  const existingFeedback = interview?.feedbacks?.find(
    (f) => f.interviewerId === user?.id,
  );

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES);
    try {
      await api.put(API_ROUTES.INTERVIEWS.STATUS(id!), { status: newStatus });
      showNotification("success", `Interview marked as ${newStatus}`);
      fetchInterview();
    } catch (err: any) {
      showNotification("error", "Failed to update status");
    } finally {
      setIsLoading(false, "");
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      communicationRating === 0 ||
      technicalRating === 0 ||
      leadershipRating === 0
    ) {
      showNotification("error", "Please provide all ratings");
      return;
    }

    setSubmittingFeedback(true);
    setIsLoading(true, UIMessages.LOADING.SAVING_CHANGES);
    try {
      await api.post(API_ROUTES.INTERVIEWS.FEEDBACK(id!), {
        communicationRating,
        technicalRating,
        leadershipRating,
        comments,
        recommendation,
      });
      showNotification("success", "Feedback submitted successfully");
      fetchInterview();
      // Reset form
      setCommunicationRating(0);
      setTechnicalRating(0);
      setLeadershipRating(0);
      setComments("");
      setRecommendation("Neutral");
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to submit feedback",
      );
    } finally {
      setSubmittingFeedback(false);
      setIsLoading(false, "");
    }
  };

  // Calculate averages
  const feedbacks = interview?.feedbacks || [];
  const avgCommunication =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.communicationRating, 0) /
        feedbacks.length
      : 0;
  const avgTechnical =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.technicalRating, 0) / feedbacks.length
      : 0;
  const avgLeadership =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.leadershipRating, 0) / feedbacks.length
      : 0;
  const avgOverall =
    feedbacks.length > 0
      ? feedbacks.reduce((s, f) => s + f.overallRating, 0) / feedbacks.length
      : 0;

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!interview) {
    return (
      <div
        className="animate-fade-in"
        style={{ textAlign: "center", padding: 60 }}
      >
        <p style={{ color: "var(--text-muted)" }}>Interview not found</p>
        <CustomButton
          variant="outline"
          onClick={() => navigate("/interviews")}
          style={{ marginTop: 16 }}
        >
          Back to Interviews
        </CustomButton>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`animate-fade-in ${styles.container}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
          <CustomButton
            variant="ghost"
            onClick={() => navigate("/interviews")}
            icon={<CustomIcon name="ArrowLeft" size={20} />}
            style={{ 
              width: 40, 
              height: 40, 
              padding: 0, 
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-glass)'
            }}
          />
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
              Interview Details
            </h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0 0", fontSize: '0.9rem' }}>
              Review candidate assessment and panel feedback
            </p>
          </div>
        </div>
      </div>

      {/* Header Card */}
      <div className={`glass-card ${styles.headerCard}`}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.headerTitle}>{interview.title}</h1>
            <div className={styles.headerMeta}>
              <span className={styles.metaItem}>
                <CustomIcon name="Calendar" size={16} />
                {formatDate(interview.scheduledAt)}
              </span>
              <span className={styles.metaItem}>
                <CustomIcon name="Clock" size={16} />
                {formatTime(interview.scheduledAt)} · {interview.duration} min
              </span>
              {interview.location && (
                <span className={styles.metaItem}>
                  <CustomIcon name="MapPin" size={16} />
                  {interview.location}
                </span>
              )}
              <span className={styles.metaItem}>
                <CustomIcon name="User" size={16} />
                Scheduled by {interview.scheduledBy.fullname}
              </span>
            </div>
          </div>
          <div className={styles.statusActions}>
            <CustomBadge variant={statusBadgeVariant(interview.status)}>
              {interview.status}
            </CustomBadge>
            {interview.status === InterviewStatus.SCHEDULED && (
              <>
                <CustomButton
                  variant="primary"
                  size="sm"
                  onClick={() => handleStatusChange(InterviewStatus.COMPLETED)}
                >
                  Mark Completed
                </CustomButton>
                <CustomButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleStatusChange(InterviewStatus.CANCELLED)}
                >
                  Cancel
                </CustomButton>
              </>
            )}
          </div>
        </div>
        {interview.notes && (
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {interview.notes}
          </p>
        )}
      </div>

      <div className={styles.mainGrid}>
        {/* Left Column: Details & Panel */}
        <div className={styles.leftCol}>
          {/* Candidate Card */}
          <div className={`glass-card ${styles.candidateCard}`}>
            <div className={styles.candidateAvatar}>
              {interview.candidate.name.charAt(0)}
            </div>
            <div className={styles.candidateDetails}>
              <div className={styles.candidateName}>
                {interview.candidate.name}
              </div>
              <div className={styles.candidatePosition}>
                {interview.candidate.position}
              </div>
              <div className={styles.candidateEmail}>
                {interview.candidate.email}
              </div>
            </div>
            <CustomButton
              variant="outline"
              size="sm"
              onClick={() => navigate(`/candidates/${interview.candidate.id}`)}
            >
              View Profile
            </CustomButton>
          </div>

          {/* Panel Members */}
          <h3 className={styles.sectionTitle}>
            <CustomIcon name="Users" size={20} />
            Interview Panel ({interview.panelMembers.length})
          </h3>
          <div className={styles.panelGrid}>
            {interview.panelMembers.map((pm) => {
              const hasFeedback = feedbacks.some(
                (f) => f.interviewerId === pm.user.id,
              );
              return (
                <div key={pm.id} className={styles.panelCard}>
                  <div className={styles.panelAvatar}>
                    {pm.user.image ? (
                      <img src={pm.user.image} alt={pm.user.fullname} />
                    ) : (
                      pm.user.fullname.charAt(0)
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className={styles.panelName}>{pm.user.fullname}</div>
                    <div className={styles.panelRole}>
                      {pm.user.role?.name || "Team Member"}
                    </div>
                  </div>
                  <span className={styles.feedbackStatus}>
                    {hasFeedback ? (
                      <CustomBadge
                        variant="success"
                        style={{ padding: "2px 8px", fontSize: "0.65rem" }}
                      >
                        Submitted
                      </CustomBadge>
                    ) : (
                      <CustomBadge
                        variant="neutral"
                        style={{ padding: "2px 8px", fontSize: "0.65rem" }}
                      >
                        Pending
                      </CustomBadge>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Feedback & Summary */}
        <div className={styles.rightCol}>
          {/* Summary Stats (if feedbacks exist) */}
          {feedbacks.length > 0 && (
            <div className={`glass-card ${styles.summaryCard}`}>
              <h3 className={styles.sectionTitle}>
                <CustomIcon name="BarChart3" size={20} />
                Rating Summary
              </h3>
              <div className={styles.summaryGrid}>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>
                    {avgOverall.toFixed(1)}
                  </div>
                  <div className={styles.summaryLabel}>Overall Score</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>
                    {avgCommunication.toFixed(1)}
                  </div>
                  <div className={styles.summaryLabel}>Communication</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>
                    {avgTechnical.toFixed(1)}
                  </div>
                  <div className={styles.summaryLabel}>Technical</div>
                </div>
                <div className={styles.summaryItem}>
                  <div className={styles.summaryValue}>
                    {avgLeadership.toFixed(1)}
                  </div>
                  <div className={styles.summaryLabel}>Leadership</div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 16,
                  borderTop: "1px solid var(--border-glass)",
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                <span>Total Feedbacks:</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                  {feedbacks.length} / {interview.panelMembers.length}
                </span>
              </div>
            </div>
          )}

          {/* Feedback Form (show if user is panelist and interview is completed) */}
          {isPanelMember &&
            interview.status === InterviewStatus.COMPLETED &&
            !existingFeedback && (
              <div className={`glass-card ${styles.feedbackFormCard}`}>
                <h3 className={styles.sectionTitle}>
                  <CustomIcon name="MessageSquarePlus" size={20} />
                  Submit Your Feedback
                </h3>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className={styles.ratingGroup}>
                    <StarRating
                      label="Communication"
                      value={communicationRating}
                      onChange={setCommunicationRating}
                    />
                    <StarRating
                      label="Technical"
                      value={technicalRating}
                      onChange={setTechnicalRating}
                    />
                    <StarRating
                      label="Leadership"
                      value={leadershipRating}
                      onChange={setLeadershipRating}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <CustomSelect
                      label="Final Recommendation"
                      value={recommendation}
                      onChange={(val) => setRecommendation(val)}
                      options={[
                        {
                          value: Recommendation.STRONG_HIRE,
                          label: "⭐ Strong Hire",
                        },
                        { value: Recommendation.HIRE, label: "✅ Hire" },
                        { value: Recommendation.NEUTRAL, label: "➖ Neutral" },
                        { value: Recommendation.NO_HIRE, label: "❌ No Hire" },
                        {
                          value: Recommendation.STRONG_NO_HIRE,
                          label: "🚫 Strong No Hire",
                        },
                      ]}
                    />
                  </div>

                  <CustomTextArea
                    label="Detailed Comments"
                    value={comments}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setComments(e.target.value)
                    }
                    placeholder="Share your detailed assessment of the candidate..."
                    rows={4}
                  />

                  <CustomButton
                    type="submit"
                    variant="gradient"
                    loading={submittingFeedback}
                    fullWidth
                    style={{ marginTop: 20 }}
                  >
                    Submit Assessment
                  </CustomButton>
                </form>
              </div>
            )}

          {/* Already submitted notice */}
          {isPanelMember && existingFeedback && (
            <div
              className="glass-card"
              style={{
                padding: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                gap: 12,
                color: "var(--accent-success)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                background: "rgba(16, 185, 129, 0.05)",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CustomIcon name="CheckCircle" size={28} />
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    marginBottom: 4,
                  }}
                >
                  Feedback Submitted
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  You have successfully shared your assessment for this
                  candidate.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feedback List */}
      {feedbacks.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>
            <CustomIcon name="ClipboardList" size={20} />
            Feedback Responses ({feedbacks.length})
          </h3>
          <div className={styles.feedbackList}>
            {feedbacks.map((f: InterviewFeedback) => (
              <div key={f.id} className={styles.feedbackCard}>
                <div className={styles.feedbackHeader}>
                  <div className={styles.feedbackAuthor}>
                    <div className={styles.feedbackAvatar}>
                      {f.interviewer.fullname.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                        {f.interviewer.fullname}
                      </div>
                      <div
                        style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {new Date(f.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    <CustomBadge
                      variant={
                        f.recommendation.includes("Hire") &&
                        !f.recommendation.includes("No")
                          ? "success"
                          : f.recommendation.includes("No")
                            ? "danger"
                            : "warning"
                      }
                    >
                      {f.recommendation}
                    </CustomBadge>
                    <div className={styles.overallScore}>
                      <CustomIcon name="Star" size={16} />
                      {f.overallRating.toFixed(1)}
                    </div>
                  </div>
                </div>

                <div className={styles.feedbackRatings}>
                  <div className={styles.ratingChip}>
                    <span className={styles.ratingChipLabel}>
                      Communication
                    </span>
                    <DisplayStars value={f.communicationRating} />
                    <span className={styles.ratingChipValue}>
                      {f.communicationRating}/5
                    </span>
                  </div>
                  <div className={styles.ratingChip}>
                    <span className={styles.ratingChipLabel}>Technical</span>
                    <DisplayStars value={f.technicalRating} />
                    <span className={styles.ratingChipValue}>
                      {f.technicalRating}/5
                    </span>
                  </div>
                  <div className={styles.ratingChip}>
                    <span className={styles.ratingChipLabel}>Leadership</span>
                    <DisplayStars value={f.leadershipRating} />
                    <span className={styles.ratingChipValue}>
                      {f.leadershipRating}/5
                    </span>
                  </div>
                </div>

                {f.comments && (
                  <div className={styles.feedbackComments}>{f.comments}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default InterviewDetail;
