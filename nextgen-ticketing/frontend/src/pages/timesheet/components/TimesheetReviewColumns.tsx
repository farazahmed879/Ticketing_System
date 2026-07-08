import { format } from "date-fns";
import { useMemo } from "react";
import CustomImage from "../../../components/CustomImage";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import CustomButton from "../../../components/CustomButton";
import { ROLE_TYPE } from "../../roles/roleConstants";
import type { TimesheetEntry } from "../../../types";

interface UseTimesheetReviewColumnsProps {
  setSelectedEntry: (e: TimesheetEntry) => void;
  setIsModalOpen: (b: boolean) => void;
  handleApprove: (id: string) => void;
  userRoleType?: string;
}

export const useTimesheetReviewColumns = ({
  setSelectedEntry,
  setIsModalOpen,
  handleApprove,
  userRoleType,
}: UseTimesheetReviewColumnsProps) => {
  const isHr = userRoleType === ROLE_TYPE.HR;
  const isManager =
    userRoleType === ROLE_TYPE.AGENT || userRoleType === ROLE_TYPE.ADMIN;

  return useMemo(() => [
    {
      header: "User",
      key: "user",
      render: (e: TimesheetEntry) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              border: "1px solid var(--border-glass)",
            }}
          >
            {e.user?.image ? (
              <CustomImage
                src={e.user.image}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <CustomIcon name="User" size={18} color="var(--text-muted)" />
            )}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
              {e.user?.fullname}
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
              }}
            >
              {e.user?.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      key: "date",
      render: (e: TimesheetEntry) => (
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 600 }}>
            {format(new Date(e.date), "MMM dd, yyyy")}
          </span>
          <span
            style={{
              fontSize: "0.75rem",
              color: "var(--text-muted)",
            }}
          >
            {format(new Date(e.date), "EEEE")}
          </span>
        </div>
      ),
    },
    {
      header: "Hours",
      key: "totalHours",
      render: (e: TimesheetEntry) => (
        <div
          style={{
            display: "inline-flex",
            padding: "4px 10px",
            borderRadius: 8,
            background: "rgba(124, 58, 237, 0.1)",
            color: "var(--accent-primary)",
            fontWeight: 700,
          }}
        >
          {e.totalHours}h
        </div>
      ),
    },
    {
      header: "Manager Status",
      key: "managerStatus",
      render: (e: TimesheetEntry) => (
        <CustomBadge
          variant={
            e.managerApproved === "APPROVED"
              ? "success"
              : e.managerApproved === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {e.managerApproved === "APPROVED"
            ? "Approved"
            : e.managerApproved === "REJECTED"
              ? "Rejected"
              : "Pending"}
        </CustomBadge>
      ),
    },
    {
      header: "HR Status",
      key: "hrStatus",
      render: (e: TimesheetEntry) => (
        <CustomBadge
          variant={
            e.hrApproved === "APPROVED"
              ? "success"
              : e.hrApproved === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {e.hrApproved === "APPROVED"
            ? "Approved"
            : e.hrApproved === "REJECTED"
              ? "Rejected"
              : "Pending"}
        </CustomBadge>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (e: TimesheetEntry) => (
        <div style={{ display: "flex", gap: 8 }}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedEntry(e);
              setIsModalOpen(true);
            }}
            icon={<CustomIcon name="Eye" size={16} />}
            style={{ padding: "8px" }}
          />
          {((isManager && e.managerApproved === "PENDING") ||
            (isHr && e.hrApproved === "PENDING")) && (
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => handleApprove(e.id)}
              icon={<CustomIcon name="CheckCircle2" size={16} />}
              style={{
                color: "var(--accent-success)",
                padding: "8px",
              }}
            />
          )}
        </div>
      ),
    },
  ], [isHr, isManager, handleApprove, setIsModalOpen, setSelectedEntry]);
};
