import React from "react";
import { format } from "date-fns";
import CustomImage from "../../../components/CustomImage";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import CustomButton from "../../../components/CustomButton";
import type { TimesheetEntry } from "../../../types";

interface TimesheetReviewCardProps {
  entry: TimesheetEntry;
  canApprove: boolean;
  onView: (entry: TimesheetEntry) => void;
  onApprove: (id: string) => void;
}

const statusVariant = (status?: string) =>
  status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";

const statusLabel = (status?: string) =>
  status === "APPROVED" ? "Approved" : status === "REJECTED" ? "Rejected" : "Pending";

export const TimesheetReviewCard: React.FC<TimesheetReviewCardProps> = ({
  entry,
  canApprove,
  onView,
  onApprove,
}) => {
  return (
    <div
      className="glass-card"
      onClick={() => onView(entry)}
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        transition: "var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: "1px solid var(--border-glass)",
            flexShrink: 0,
          }}
        >
          {entry.user?.image ? (
            <CustomImage
              src={entry.user.image}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <CustomIcon name="User" size={18} color="var(--text-muted)" />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontWeight: 600,
              fontSize: "0.9rem",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.user?.fullname}
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {entry.user?.email}
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 8,
            background: "rgba(124, 58, 237, 0.1)",
            color: "var(--accent-primary)",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {entry.totalHours}h
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-secondary)",
          fontSize: "0.85rem",
        }}
      >
        <CustomIcon name="Calendar" size={14} />
        <span style={{ fontWeight: 600 }}>
          {format(new Date(entry.date), "MMM dd, yyyy")}
        </span>
        <span style={{ color: "var(--text-muted)" }}>
          · {format(new Date(entry.date), "EEEE")}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: 10,
          borderTop: "1px solid var(--border-glass)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", width: 60 }}>
              Manager
            </span>
            <CustomBadge variant={statusVariant(entry.managerApproved)}>
              {statusLabel(entry.managerApproved)}
            </CustomBadge>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", width: 60 }}>
              HR
            </span>
            <CustomBadge variant={statusVariant(entry.hrApproved)}>
              {statusLabel(entry.hrApproved)}
            </CustomBadge>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }} onClick={(e) => e.stopPropagation()}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => onView(entry)}
            icon={<CustomIcon name="Eye" size={16} />}
            style={{ padding: "8px" }}
            title="Review"
          />
          {canApprove && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => onApprove(entry.id)}
              icon={<CustomIcon name="CheckCircle2" size={16} />}
              style={{ color: "var(--accent-success)", padding: "8px" }}
              title="Approve"
            />
          )}
        </div>
      </div>
    </div>
  );
};
