import React from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";

export interface DuplicateConflictCandidate {
  id: string;
  name: string;
  email: string;
  position: string;
}

interface DuplicateConflictModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingCandidate: DuplicateConflictCandidate | null;
  onResolve: (action: "update" | "replace") => Promise<void>;
  isResolving?: boolean;
}

const DuplicateConflictModal: React.FC<DuplicateConflictModalProps> = ({
  isOpen,
  onClose,
  existingCandidate,
  onResolve,
  isResolving = false,
}) => {
  if (!existingCandidate) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Candidate Detected"
      maxWidth="560px"
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            gap: "10px",
          }}
        >
          <CustomButton
            variant="secondary"
            onClick={onClose}
            disabled={isResolving}
          >
            Keep existing / discard new upload
          </CustomButton>

          <CustomButton
            variant="gradient"
            onClick={() => onResolve("replace")}
            loading={isResolving}
            disabled={isResolving}
            icon={<CustomIcon name="RefreshCw" size={16} />}
          >
            Replace existing record
          </CustomButton>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* Warning Banner */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: "12px",
            padding: "14px 16px",
            display: "flex",
            gap: "12px",
            alignItems: "flex-start",
          }}
        >
          <CustomIcon name="AlertTriangle" size={22} color="#f59e0b" />
          <div style={{ fontSize: "0.88rem", color: "var(--text-main)", lineHeight: 1.5 }}>
            A candidate with email{" "}
            <strong style={{ color: "#f59e0b" }}>{existingCandidate.email}</strong> is
            already registered for the position{" "}
            <strong style={{ color: "#f59e0b" }}>{existingCandidate.position}</strong>.
            How would you like to handle this upload?
          </div>
        </div>

        {/* Existing Record Snapshot Card */}
        <div
          style={{
            background: "var(--bg-glass-hover, rgba(255, 255, 255, 0.03))",
            border: "1px solid var(--border-glass, rgba(255, 255, 255, 0.1))",
            borderRadius: "12px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Existing Record in Database
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Candidate Name
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-main)", marginTop: "2px" }}>
                {existingCandidate.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                Position / Role
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--accent-primary)", marginTop: "2px" }}>
                {existingCandidate.position}
              </div>
            </div>
          </div>
        </div>

        {/* Option Descriptions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <div>• <strong>Update Existing</strong>: Overwrites the existing candidate record with the new resume info.</div>
          <div>• <strong>Delete Old & Replace</strong>: Soft-deletes the old candidate record and creates a fresh entry.</div>
          <div>• <strong>Cancel (Do Not Save)</strong>: Leaves the existing database record untouched.</div>
        </div>
      </div>
    </Modal>
  );
};

export default DuplicateConflictModal;
