import React, { useState, useEffect, useCallback } from "react";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
} from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomBadge from "../../../components/CustomBadge";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import styles from "./ProjectDeveloperHours.module.css";

interface DeveloperTask {
  id: string;
  description: string;
  hours: number;
  date: string;
  ticket?: {
    id: string;
    uid: number;
    subject: string;
  } | null;
}

interface DeveloperStats {
  id: string;
  fullname: string;
  email: string;
  image?: string | null;
  role: string;
  teamNames: string[];
  totalHours: number;
  taskCount: number;
  percentage: number;
  recentTasks: DeveloperTask[];
}

interface ProjectDeveloperHoursProps {
  projectId: string;
}

const ProjectDeveloperHours: React.FC<ProjectDeveloperHoursProps> = ({
  projectId,
}) => {
  const [period, setPeriod] = useState<"weekly" | "monthly">("weekly");
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [developers, setDevelopers] = useState<DeveloperStats[]>([]);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedDevId, setExpandedDevId] = useState<string | null>(null);

  const fetchDeveloperHours = useCallback(async () => {
    setLoading(true);
    try {
      const start =
        period === "monthly"
          ? startOfMonth(currentDate)
          : startOfWeek(currentDate, { weekStartsOn: 1 });
      const end =
        period === "monthly"
          ? endOfMonth(currentDate)
          : endOfWeek(currentDate, { weekStartsOn: 1 });

      const res = await api.get(API_ROUTES.PROJECTS.DEVELOPER_HOURS(projectId), {
        params: {
          startDate: format(start, "yyyy-MM-dd"),
          endDate: format(end, "yyyy-MM-dd"),
        },
      });

      if (res.data.success) {
        setDevelopers(res.data.developers || []);
        setTotalHours(res.data.totalHours || 0);
      }
    } catch (err) {
      console.error("Failed to load developer hours for project:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, period, currentDate]);

  useEffect(() => {
    fetchDeveloperHours();
  }, [fetchDeveloperHours]);

  const handlePrev = () => {
    if (period === "monthly") {
      setCurrentDate((prev) => subMonths(prev, 1));
    } else {
      setCurrentDate((prev) => subWeeks(prev, 1));
    }
  };

  const handleNext = () => {
    if (period === "monthly") {
      setCurrentDate((prev) => addMonths(prev, 1));
    } else {
      setCurrentDate((prev) => addWeeks(prev, 1));
    }
  };

  const handleResetCurrent = () => {
    setCurrentDate(new Date());
  };

  const getDateTitle = () => {
    if (period === "monthly") {
      return format(currentDate, "MMMM yyyy");
    }
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const sameMonth = isSameMonth(start, end);
    if (sameMonth) {
      return `${format(start, "MMM d")} - ${format(end, "d, yyyy")}`;
    }
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  };

  const activeDevCount = developers.filter((d) => d.totalHours > 0).length;
  const avgHours =
    activeDevCount > 0 ? (totalHours / activeDevCount).toFixed(1) : "0.0";

  return (
    <div className={`glass-card ${styles.container}`}>
      {/* Header with Title and Filters */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <CustomIcon
            name="Clock"
            size={22}
            color="var(--accent-primary)"
          />
          <div>
            <h3 className={styles.title}>Developer Hours</h3>
          </div>
        </div>

        <div className={styles.filtersRow}>
          {/* Weekly vs Total Month filter toggle */}
          <div className={styles.periodToggle}>
            <CustomButton
              variant={period === "weekly" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("weekly")}
              icon={<CustomIcon name="CalendarRange" size={15} />}
              style={{
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.85rem",
                fontWeight: period === "weekly" ? 700 : 500,
              }}
            >
              Weekly
            </CustomButton>
            <CustomButton
              variant={period === "monthly" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setPeriod("monthly")}
              icon={<CustomIcon name="Calendar" size={15} />}
              style={{
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "0.85rem",
                fontWeight: period === "monthly" ? 700 : 500,
              }}
            >
              Total Month
            </CustomButton>
          </div>

          {/* Date navigators */}
          <div className={styles.navGroup}>
            <CustomButton
              variant="secondary"
              size="sm"
              onClick={handlePrev}
              title={period === "monthly" ? "Previous Month" : "Previous Week"}
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <CustomIcon name="ChevronLeft" size={18} />
            </CustomButton>

            <span className={styles.dateLabel}>{getDateTitle()}</span>

            <CustomButton
              variant="secondary"
              size="sm"
              onClick={handleResetCurrent}
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "4px 10px",
                height: 34,
              }}
            >
              {period === "monthly" ? "This Month" : "Current Week"}
            </CustomButton>

            <CustomButton
              variant="secondary"
              size="sm"
              onClick={handleNext}
              title={period === "monthly" ? "Next Month" : "Next Week"}
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <CustomIcon name="ChevronRight" size={18} />
            </CustomButton>
          </div>
        </div>
      </div>

      {/* Metrics Summary Grid */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Calculated Hours</span>
          <div className={styles.statValue}>
            {totalHours.toFixed(1)}
            <span className={styles.statUnit}>hrs</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Contributors</span>
          <div className={styles.statValue}>
            {activeDevCount}
            <span className={styles.statUnit}>
              / {developers.length} team members
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <span className={styles.statLabel}>Avg Hours / Developer</span>
          <div className={styles.statValue}>
            {avgHours}
            <span className={styles.statUnit}>hrs</span>
          </div>
        </div>
      </div>

      {/* Developers List */}
      {loading ? (
        <div style={{ padding: "30px 0", textAlign: "center", color: "var(--text-muted)" }}>
          <CustomIcon name="Loader2" size={26} className="animate-spin" />
          <p style={{ marginTop: 8, fontSize: "0.9rem" }}>Calculating developer hours...</p>
        </div>
      ) : developers.length === 0 ? (
        <div className={styles.emptyState}>
          <CustomIcon name="Clock" size={36} color="var(--text-muted)" />
          <p style={{ margin: 0, fontWeight: 500 }}>
            No developers or teams assigned to this project yet.
          </p>
        </div>
      ) : (
        <div className={styles.devList}>
          {developers.map((dev) => {
            const isExpanded = expandedDevId === dev.id;
            const hasTasks = dev.recentTasks && dev.recentTasks.length > 0;

            return (
              <div key={dev.id} className={styles.devCard}>
                <div
                  className={styles.devMainRow}
                  onClick={() =>
                    hasTasks &&
                    setExpandedDevId(isExpanded ? null : dev.id)
                  }
                  role={hasTasks ? "button" : undefined}
                  tabIndex={hasTasks ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (hasTasks && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      setExpandedDevId(isExpanded ? null : dev.id);
                    }
                  }}
                >
                  {/* Left: Avatar & Developer Details */}
                  <div className={styles.devInfo}>
                    <div className={styles.avatar}>
                      {dev.image ? (
                        <img src={dev.image} alt={dev.fullname} />
                      ) : (
                        dev.fullname.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className={styles.devMeta}>
                      <span className={styles.devName}>{dev.fullname}</span>
                      <div className={styles.devSub}>
                        <CustomBadge variant="neutral">{dev.role}</CustomBadge>
                        {dev.teamNames && dev.teamNames.length > 0 && (
                          <span>Team: {dev.teamNames.join(", ")}</span>
                        )}
                        {dev.taskCount > 0 && (
                          <span>
                            • {dev.taskCount}{" "}
                            {dev.taskCount === 1 ? "task" : "tasks"} logged
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Hours & Contribution Progress */}
                  <div className={styles.hoursSection}>
                    <div className={styles.progressBarContainer}>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${Math.min(dev.percentage, 100)}%` }}
                        />
                      </div>
                      <span className={styles.progressPercent}>
                        {dev.percentage}%
                      </span>
                    </div>

                    <div className={styles.hoursBadge}>
                      <span className={styles.hoursNumber}>
                        {dev.totalHours.toFixed(1)}
                      </span>
                      <span className={styles.hoursLabel}>hours</span>
                    </div>

                    {hasTasks && (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedDevId(isExpanded ? null : dev.id);
                        }}
                        style={{ width: 32, height: 32, padding: 0 }}
                        title={isExpanded ? "Collapse tasks" : "Expand tasks"}
                      >
                        <CustomIcon
                          name={isExpanded ? "ChevronUp" : "ChevronDown"}
                          size={18}
                        />
                      </CustomButton>
                    )}
                  </div>
                </div>

                {/* Expandable Task Breakdown Drawer */}
                {isExpanded && hasTasks && (
                  <div className={styles.tasksDrawer}>
                    <div className={styles.tasksHeader}>
                      Logged Tasks for this Period
                    </div>
                    {dev.recentTasks.map((task) => (
                      <div key={task.id} className={styles.taskItem}>
                        <div className={styles.taskDesc} title={task.description}>
                          {task.ticket && (
                            <strong style={{ color: "var(--accent-primary)", marginRight: 6 }}>
                              #{task.ticket.uid}
                            </strong>
                          )}
                          {task.description}
                        </div>
                        <div className={styles.taskMeta}>
                          <span>
                            {new Date(task.date).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <span className={styles.taskHours}>
                            {task.hours.toFixed(1)} hrs
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectDeveloperHours;
