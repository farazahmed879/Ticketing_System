import React from "react";
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";

interface NewHiresSectionProps {
  newHires: any[];
  onViewAll: () => void;
}

const NewHiresSection: React.FC<NewHiresSectionProps> = ({ newHires, onViewAll }) => {
  const navigate = useNavigate();
  return (
    <div className={`${styles.welcomeSection} glass-card`} style={{ padding: "24px" }}>
      <div className={styles.welcomeHeader}>
        <div className={styles.welcomeTitle}>
          <CustomIcon name="Sparkles" size={24} />
          <h2>New Team Members</h2>
        </div>
        {newHires.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            {newHires.length} new hires in last 7 days
          </p>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {newHires.length > 0 ? (
          newHires.slice(0, 3).map((hire) => (
            <div 
              key={hire.id} 
              className={`${styles.newHireCard} ${(isToday(new Date(hire.createdAt)) || isYesterday(new Date(hire.createdAt))) ? styles.featuredNewHire : ''}`}
              onClick={() => navigate(`/profile/${hire.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.avatarWrapper}>
                {hire.image ? (
                  <img
                    src={hire.image}
                    alt={hire.fullname}
                    className={styles.hireAvatar}
                  />
                ) : (
                  <div className={styles.avatarPlaceholder} style={{ background: `linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)` }}>
                    {hire.fullname.charAt(0)}
                  </div>
                )}
                {(isToday(new Date(hire.createdAt)) || isYesterday(new Date(hire.createdAt))) && (
                  <span className={styles.newBadge}>NEW</span>
                )}
              </div>
              
              <div className={styles.newHireInfo}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h4 className={styles.hireName} style={{ margin: 0 }}>{hire.fullname}</h4>
                  {hire.role?.name && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: "var(--accent-primary)",
                        background: "rgba(var(--accent-primary-rgb, 99, 102, 241), 0.12)",
                        border: "1px solid rgba(var(--accent-primary-rgb, 99, 102, 241), 0.25)",
                        lineHeight: 1.4,
                      }}
                    >
                      <CustomIcon name="Shield" size={10} />
                      {hire.role.name}
                    </span>
                  )}
                </div>
                <p className={styles.hireTitle}>{hire.title || 'Team Member'}</p>
                <div className={styles.hireMeta}>
                  <CustomIcon name="Clock" size={10} />
                  <span>{formatDistanceToNow(new Date(hire.createdAt), { addSuffix: true })}</span>
                </div>
              </div>
              
              <div className={styles.popperIcon}>
                <CustomIcon
                  name="PartyPopper"
                  color="var(--accent-success)"
                  size={20}
                />
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No new hires this week
          </div>
        )}
      </div>

      <p
        style={{
          marginTop: "16px",
          fontSize: "0.85rem",
          color: "var(--text-muted)",
          lineHeight: "1.4",
        }}
      >
        {newHires.length > 0 
          ? "We're thrilled to have new members join Jami Partners! Let's build something amazing together."
          : "We're always looking for talented people to join our growing team."}
      </p>

      <button
        className={styles.expandBtn}
        onClick={onViewAll}
        disabled={newHires.length === 0}
        style={{ opacity: newHires.length === 0 ? 0.5 : 1 }}
      >
        View All New Hires <CustomIcon name="Maximize2" size={14} />
      </button>
    </div>
  );
};

export default NewHiresSection;
