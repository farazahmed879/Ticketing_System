import React from "react";
import { useNavigate } from "react-router-dom";
import { timeAgo } from "../../../utils/helpers";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Dashboard.module.css";
import SectionHeader from "./SectionHeader";
import EmptyState from "./EmptyState";

interface RecentTicketsSectionProps {
  /** recentTickets from /common/dashboard (already scoped to the caller) */
  tickets: any[];
  limit?: number;
}

const PRIORITY_TONE: Record<string, string> = {
  urgent: "var(--accent-danger)",
  high: "var(--accent-danger)",
  normal: "var(--accent-secondary)",
  medium: "var(--accent-secondary)",
  low: "var(--accent-success)",
};

const RecentTicketsSection: React.FC<RecentTicketsSectionProps> = ({
  tickets,
  limit = 6,
}) => {
  const navigate = useNavigate();
  const list = tickets.slice(0, limit);

  return (
    <section className={`${styles.section} glass-card`}>
      <SectionHeader
        icon="Ticket"
        tone="var(--accent-primary)"
        title="Recent Tickets"
        action={
          tickets.length > 0 ? (
            <button
              type="button"
              className={styles.textLinkBtn}
              onClick={() => navigate("/tickets")}
            >
              View all
              <CustomIcon name="ArrowRight" size={14} />
            </button>
          ) : undefined
        }
      />

      {list.length === 0 ? (
        <EmptyState
          icon="Inbox"
          title="No tickets yet"
          hint="Tickets you create or are assigned will show up here."
        />
      ) : (
        <ul className={styles.ticketList}>
          {list.map((t) => {
            const priority = t.priority?.name as string | undefined;
            const pTone =
              PRIORITY_TONE[priority?.toLowerCase() ?? ""] ?? "var(--text-muted)";
            return (
              <li key={t.id}>
                <button
                  type="button"
                  className={styles.ticketRow}
                  onClick={() => navigate(`/tickets/${t.id}`)}
                >
                  <span className={styles.ticketMain}>
                    <span className={styles.ticketSubjectLine}>
                      <span className={styles.ticketUid}>#{t.uid}</span>
                      <span className={styles.ticketSubject}>{t.subject}</span>
                    </span>
                    <span className={styles.ticketSub}>
                      {t.project?.name && (
                        <>
                          {t.project.name}
                          <span className={styles.dot} aria-hidden="true">·</span>
                        </>
                      )}
                      {timeAgo(t.createdAt)}
                    </span>
                  </span>

                  {priority && (
                    <span
                      className={styles.priorityTag}
                      style={{ "--tone": pTone } as React.CSSProperties}
                      title={`${priority} priority`}
                    >
                      <CustomIcon name="Flag" size={12} />
                      <span className={styles.priorityText}>{priority}</span>
                    </span>
                  )}

                  {t.status && (
                    <span
                      className={styles.statusPill}
                      style={{ "--tone": t.status.color } as React.CSSProperties}
                    >
                      {t.status.name}
                    </span>
                  )}

                  <span
                    className={styles.assigneeAvatar}
                    title={t.assignee?.fullname ? `Assigned to ${t.assignee.fullname}` : "Unassigned"}
                    aria-label={t.assignee?.fullname ? `Assigned to ${t.assignee.fullname}` : "Unassigned"}
                  >
                    {t.assignee?.fullname ? (
                      t.assignee.fullname.charAt(0)
                    ) : (
                      <CustomIcon name="UserRound" size={13} />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecentTicketsSection;
