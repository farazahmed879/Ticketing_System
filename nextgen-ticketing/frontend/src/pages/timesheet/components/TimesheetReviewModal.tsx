import React from "react";
import { format } from "date-fns";
import Modal from "../../../components/Modal";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import type { TimesheetEntry } from "../../../types";

interface TimesheetReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimesheetEntry | null;
  rejectReason: string;
  onRejectReasonChange: (reason: string) => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

const TimesheetReviewModal: React.FC<TimesheetReviewModalProps> = ({
  isOpen,
  onClose,
  entry,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
}) => {
  if (!entry) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review: ${entry.user?.fullname} - ${format(new Date(entry.date), "MMM dd, yyyy")}`}
      maxWidth="700px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          className="glass-card"
          style={{ padding: 16, background: "rgba(255,255,255,0.02)" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <span style={{ color: "var(--text-muted)" }}>Total Hours:</span>
            <strong style={{ fontSize: "1.2rem" }}>{entry.totalHours}h</strong>
          </div>
          {entry.notes && (
            <div
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                fontStyle: "italic",
              }}
            >
              "{entry.notes}"
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h4 style={{ fontWeight: 600 }}>Tasks</h4>
          {entry.tasks.map((t, i) => (
            <div
              key={i}
              className="glass-card"
              style={{
                padding: 12,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                  {t.description}
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: 12,
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {t.project && (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CustomIcon name="Layers" size={12} /> {t.project.name}
                    </span>
                  )}
                  {t.ticket && (
                    <span
                      style={{ display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CustomIcon name="Calendar" size={12} /> Ticket #
                      {t.ticket.uid}
                    </span>
                  )}
                </div>
              </div>
              <strong style={{ color: "var(--accent-primary)" }}>
                {t.hours}h
              </strong>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 10 }}>
          <label
            style={{
              fontSize: "0.9rem",
              color: "var(--text-secondary)",
              marginBottom: 8,
              display: "block",
            }}
          >
            Rejection Reason (if applicable)
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => onRejectReasonChange(e.target.value)}
            placeholder="Explain why this timesheet is being rejected..."
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid var(--border-glass)",
              color: "white",
              resize: "none",
            }}
            rows={3}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 10,
          }}
        >
          <CustomButton
            variant="secondary"
            onClick={() => onReject(entry.id)}
            style={{ color: "var(--accent-danger)" }}
            icon={<CustomIcon name="XCircle" size={18} />}
          >
            Reject
          </CustomButton>
          <CustomButton
            variant="gradient"
            onClick={() => onApprove(entry.id)}
            style={{ background: "var(--accent-success)", border: "none" }}
            icon={<CustomIcon name="CheckCircle2" size={18} />}
          >
            Approve
          </CustomButton>
        </div>
      </div>
    </Modal>
  );
};

export default TimesheetReviewModal;
