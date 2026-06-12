import React, { useState, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import { useAuth } from "../../../context/AuthContext";
import styles from "../Dashboard.module.css";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";

interface MomentsSectionProps {
  moments: any[];
  seenMomentIds?: string[];
}

interface JoyParticle {
  id: number;
  char: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotate: number;
}

const MomentsSection: React.FC<MomentsSectionProps> = ({ moments, seenMomentIds = [] }) => {
  const { user } = useAuth();
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);
  const [particles, setParticles] = useState<JoyParticle[]>([]);
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [localSeenMoments, setLocalSeenMoments] = useState<string[]>([]);

  useEffect(() => {
    if (selectedMoment) {
      // Generate particles
      const emojis = ["✨", "🎉", "🎈", "🌟", "🥳", "🤩", "🚀", "🌸", "🍀", "💛"];
      const newParticles: JoyParticle[] = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        char: emojis[Math.floor(Math.random() * emojis.length)],
        left: Math.random() * 100, // percentage 0-100
        delay: Math.random() * 2, // delay up to 2s
        duration: 2.5 + Math.random() * 2.5, // speed 2.5s to 5s
        size: 18 + Math.random() * 28, // size 18px to 46px
        rotate: Math.random() * 360,
      }));
      setParticles(newParticles);

      // Play joyful sound
      const audio = new Audio(
        "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
      );
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio blocked", e));
    } else {
      setParticles([]);
    }
  }, [selectedMoment]);

  useEffect(() => {
    if (user && moments && moments.length > 0) {
      // Find the latest moment
      const sortedMoments = [...moments].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const latestMoment = sortedMoments[0];
      
      const hasSeen = seenMomentIds.includes(latestMoment.id) || localSeenMoments.includes(latestMoment.id);
      
      if (!hasSeen && latestMoment.shouldPopout) {
        setSelectedMoment(latestMoment);
        setLocalSeenMoments((prev) => [...prev, latestMoment.id]);

        api.post(API_ROUTES.ANNOUNCEMENTS.MARK_SEEN(latestMoment.id)).catch((err) => {
          console.error("Failed to mark moment as seen in database", err);
        });
      }
    }
  }, [user, moments, seenMomentIds, localSeenMoments]);

  const renderSectionContent = () => (
    <>
      <div className={styles.welcomeHeader}>
        <div className={styles.welcomeTitle} style={{ color: "var(--accent-secondary)" }}>
          <CustomIcon name="Sparkles" size={24} />
          <h2>Moments of Joy</h2>
        </div>
        <button
          className={styles.expandSectionBtn}
          onClick={() => setIsSectionExpanded(!isSectionExpanded)}
          title={isSectionExpanded ? "Collapse" : "Expand"}
        >
          <CustomIcon name={isSectionExpanded ? "Minimize2" : "Maximize2"} size={16} />
        </button>
      </div>
      <div className={styles.momentsList}>
        {moments.length > 0 ? (
          moments.map((mom) => (
            <div
              key={mom.id}
              className={styles.momentCard}
              onClick={() => setSelectedMoment(mom)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.momentHeader}>
                <div className={styles.momentAuthor}>
                  {mom.author?.image ? (
                    <img src={mom.author.image} alt="" className={styles.momentAvatar} />
                  ) : (
                    <div
                      className={styles.momentAvatar}
                      style={{
                        background: "var(--accent-secondary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: "10px",
                      }}
                    >
                      {mom.author?.fullname?.charAt(0)}
                    </div>
                  )}
                  <span className={styles.momentAuthorName}>{mom.author?.fullname}</span>
                </div>
                <span className={styles.momentDate}>
                  {formatDistanceToNow(new Date(mom.date), { addSuffix: true })}
                </span>
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
    </>
  );

  return (
    <>
      {isSectionExpanded ? (
        <div className={styles.fullscreenSectionOverlay} onClick={() => setIsSectionExpanded(false)}>
          <div className={styles.fullscreenSectionContent} onClick={(e) => e.stopPropagation()}>
            {renderSectionContent()}
          </div>
        </div>
      ) : (
        <div className={`${styles.momentsSection} glass-card`}>
          {renderSectionContent()}
        </div>
      )}

      {/* Fullscreen Animated Overlay for Highlighted Moment of Joy */}
      {selectedMoment && (
        <div
          className={styles.joyOverlay}
          onClick={() => setSelectedMoment(null)}
        >
          {/* Floating joy particles */}
          {particles.map((p) => (
            <span
              key={p.id}
              className={styles.joyParticle}
              style={{
                left: `${p.left}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                fontSize: `${p.size}px`,
                transform: `rotate(${p.rotate}deg)`,
              }}
            >
              {p.char}
            </span>
          ))}

          {/* Highlighted Card Container */}
          <div
            className={`${styles.highlightedMomentCard} glass-card`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeOverlayBtn}
              onClick={() => setSelectedMoment(null)}
              title="Close"
            >
              <CustomIcon name="X" size={20} />
            </button>

            <div className={styles.highlightHeader}>
              <div className={styles.welcomeTitle} style={{ color: "var(--accent-warning)", gap: 12 }}>
                <span className={styles.cardSparkle}>✨</span>
                <h3 style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--accent-warning)" }}>Moment of Joy!</h3>
                <span className={styles.cardSparkle}>✨</span>
              </div>
            </div>

            <div className={styles.highlightBody}>
              <h2 className={styles.highlightTitle}>{selectedMoment.title}</h2>
              <p className={styles.highlightText}>{selectedMoment.description}</p>
            </div>

            <div className={styles.highlightFooter}>
              <div className={styles.momentAuthor}>
                {selectedMoment.author?.image ? (
                  <img
                    src={selectedMoment.author.image}
                    alt=""
                    className={styles.highlightAvatar}
                  />
                ) : (
                  <div
                    className={styles.highlightAvatar}
                    style={{
                      background: "var(--accent-warning)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "14px",
                      fontWeight: 700,
                    }}
                  >
                    {selectedMoment.author?.fullname?.charAt(0)}
                  </div>
                )}
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                    }}
                  >
                    {selectedMoment.author?.fullname}
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {selectedMoment.author?.role?.name || "Team Member"}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {formatDistanceToNow(new Date(selectedMoment.date), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MomentsSection;
