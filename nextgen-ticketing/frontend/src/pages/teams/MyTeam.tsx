import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useAuth } from "../../context/AuthContext";
import styles from "./MyTeam.module.css";

interface TeamMember {
  id: string;
  fullname: string;
  email: string;
  image?: string;
  role?: { id: string; name: string };
}

interface MyTeamData {
  id: string;
  name: string;
  description?: string;
  teamLead?: { id: string; fullname: string; email: string; image?: string };
  members: TeamMember[];
}

const MyTeam: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<MyTeamData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyTeam = async () => {
      try {
        setLoading(true);
        const res = await api.get(API_ROUTES.TEAMS.MY_TEAM);
        setTeams(res.data.teams || []);
      } catch (err) {
        console.error("Failed to fetch my team", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyTeam();
  }, []);

  const totalMembers = teams.reduce((sum, t) => sum + (t.members?.length || 0), 0);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "linear-gradient(135deg, #7c3aed, #a78bfa)",
      "linear-gradient(135deg, #06b6d4, #67e8f9)",
      "linear-gradient(135deg, #10b981, #6ee7b7)",
      "linear-gradient(135deg, #f59e0b, #fcd34d)",
      "linear-gradient(135deg, #ef4444, #fca5a5)",
      "linear-gradient(135deg, #8b5cf6, #c4b5fd)",
      "linear-gradient(135deg, #ec4899, #f9a8d4)",
      "linear-gradient(135deg, #14b8a6, #5eead4)",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>My Team</h1>
            <p className={styles.headerSubtitle}>Loading your team...</p>
          </div>
        </div>

        {/* Skeleton loading */}
        <div className={styles.statsRow}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.statCard}>
              <div
                className={`${styles.skeletonAvatar} skeleton-pulse`}
                style={{ width: 40, height: 40, borderRadius: 12 }}
              />
              <div style={{ flex: 1 }}>
                <div className={`${styles.skeletonLine} skeleton-pulse`} style={{ width: "40%" }} />
                <div className={`${styles.skeletonLineShort} skeleton-pulse`} />
              </div>
            </div>
          ))}
        </div>

        <div className={styles.skeletonGrid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={`${styles.skeletonAvatar} skeleton-pulse`} />
              <div style={{ flex: 1 }}>
                <div className={`${styles.skeletonLine} skeleton-pulse`} />
                <div className={`${styles.skeletonLineShort} skeleton-pulse`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.headerTitle}>My Team</h1>
            <p className={styles.headerSubtitle}>Your team members and collaborators</p>
          </div>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <CustomIcon name="Users" size={36} color="var(--accent-primary)" />
          </div>
          <h2 className={styles.emptyTitle}>No Team Assigned</h2>
          <p className={styles.emptySubtitle}>
            You are not currently assigned to any team. Contact your manager or
            HR to get added to a team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.headerTitle}>My Team</h1>
          <p className={styles.headerSubtitle}>
            Your team members and collaborators
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "rgba(124, 58, 237, 0.1)" }}
          >
            <CustomIcon name="Users" size={20} color="var(--accent-primary)" />
          </div>
          <div>
            <div className={styles.statValue}>{totalMembers}</div>
            <div className={styles.statLabel}>Total Members</div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "rgba(6, 182, 212, 0.1)" }}
          >
            <CustomIcon
              name="ShieldCheck"
              size={20}
              color="var(--accent-secondary)"
            />
          </div>
          <div>
            <div className={styles.statValue}>{teams.length}</div>
            <div className={styles.statLabel}>
              {teams.length === 1 ? "Team" : "Teams"}
            </div>
          </div>
        </div>

        <div className={styles.statCard}>
          <div
            className={styles.statIconWrap}
            style={{ background: "rgba(16, 185, 129, 0.1)" }}
          >
            <CustomIcon
              name="Crown"
              size={20}
              color="var(--accent-success)"
            />
          </div>
          <div>
            <div className={styles.statValue}>
              {teams.filter((t) => t.teamLead?.id === user?.id).length}
            </div>
            <div className={styles.statLabel}>Leading</div>
          </div>
        </div>
      </div>

      {teams.map((team) => (
        <div key={team.id} className={styles.teamSection}>
          <div className={styles.teamHeader}>
            <div className={styles.teamIconWrap}>
              <CustomIcon
                name="ShieldCheck"
                size={24}
                color="var(--accent-primary)"
              />
            </div>
            <div>
              <div className={styles.teamName}>{team.name}</div>
              <div className={styles.teamMeta}>
                <span className={styles.teamMetaItem}>
                  <CustomIcon name="Users" size={14} />
                  {team.members?.length || 0} members
                </span>
                {team.description && (
                  <span className={styles.teamMetaItem}>
                    {team.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Team Lead Card */}
          {team.teamLead && (
            <div
              className={styles.managerCard}
              onClick={() => navigate(`/profile/${team.teamLead!.id}`)}
              style={{ cursor: "pointer" }}
            >
              <div
                className={styles.avatar}
                style={{
                  background: team.teamLead.image
                    ? "transparent"
                    : getAvatarColor(team.teamLead.fullname),
                  color: team.teamLead.image ? undefined : "white",
                }}
              >
                {team.teamLead.image ? (
                  <img
                    src={team.teamLead.image}
                    alt={team.teamLead.fullname}
                  />
                ) : (
                  getInitials(team.teamLead.fullname)
                )}
              </div>
              <div className={styles.memberInfo}>
                <div className={styles.managerLabel}>Team Lead</div>
                <div className={styles.memberName}>
                  {team.teamLead.fullname}
                  {team.teamLead.id === user?.id && (
                    <span className={styles.youBadge}>You</span>
                  )}
                </div>
                <div className={styles.memberEmail}>
                  {team.teamLead.email}
                </div>
              </div>
              <CustomIcon
                name="Crown"
                size={20}
                color="var(--accent-warning)"
              />
            </div>
          )}

          {/* Members Grid */}
          <div className={styles.membersGrid}>
            {team.members
              ?.filter((m) => m.id !== team.teamLead?.id)
              .map((member, index) => (
                <div
                  key={member.id}
                  className={styles.memberCard}
                  onClick={() => navigate(`/profile/${member.id}`)}
                  style={{
                    animationDelay: `${index * 0.05}s`,
                    animation: `fadeIn 0.4s ease ${index * 0.05}s forwards`,
                    opacity: 0,
                  }}
                >
                  <div
                    className={styles.avatar}
                    style={{
                      background: member.image
                        ? "transparent"
                        : getAvatarColor(member.fullname),
                      color: member.image ? undefined : "white",
                    }}
                  >
                    {member.image ? (
                      <img src={member.image} alt={member.fullname} />
                    ) : (
                      getInitials(member.fullname)
                    )}
                  </div>
                  <div className={styles.memberInfo}>
                    <div className={styles.memberName}>
                      {member.fullname}
                      {member.id === user?.id && (
                        <span className={styles.youBadge}>You</span>
                      )}
                    </div>
                    <div className={styles.memberRole}>
                      {member.role?.name || "Team Member"}
                    </div>
                    <div className={styles.memberEmail}>{member.email}</div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MyTeam;
