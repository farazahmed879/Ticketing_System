import { format } from "date-fns";
import CustomImage from "../../../components/CustomImage";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import CustomButton from "../../../components/CustomButton";
import type { TimesheetEntry } from "../../../types";

interface UseTimesheetReviewColumnsProps {
  setSelectedEntry: (entry: TimesheetEntry) => void;
  setIsModalOpen: (open: boolean) => void;
  handleApprove: (id: string) => void;
}

export const useTimesheetReviewColumns = ({
  setSelectedEntry,
  setIsModalOpen,
  handleApprove,
}: UseTimesheetReviewColumnsProps) => {
  return [
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
      header: "Status",
      key: "status",
      render: (e: TimesheetEntry) => (
        <CustomBadge
          variant={
            e.status === "APPROVED"
              ? "success"
              : e.status === "REJECTED"
                ? "danger"
                : "warning"
          }
        >
          {e.status}
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
          {e.status === "PENDING" && (
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
  ];
};
