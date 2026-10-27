import React, { useState } from "react";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";

interface DeleteAllCandidatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number) => void;
  totalCandidates?: number;
}

const REQUIRED_CONFIRMATION = "DELETE";

const DeleteAllCandidatesModal: React.FC<DeleteAllCandidatesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  totalCandidates,
}) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { showNotification } = useNotification();

  const isConfirmationMatched =
    confirmationInput.trim().toUpperCase() === REQUIRED_CONFIRMATION;
  const isFormValid = isConfirmationMatched && password.trim().length > 0;

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmationInput("");
    setPassword("");
    setShowPassword(false);
    setErrorMsg(null);
    onClose();
  };

  const handleDeleteAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await api.post(API_ROUTES.CANDIDATES.DELETE_ALL, {
        password: password.trim(),
      });

      const deletedCount = response.data?.count ?? totalCandidates ?? 0;
      showNotification(
        "success",
        response.data?.message || `Successfully deleted ${deletedCount} candidates.`,
      );

      handleClose();
      onSuccess(deletedCount);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        "Failed to delete all candidates. Please check your password.";
      setErrorMsg(msg);
      showNotification("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete All Candidates"
      maxWidth="480px"
      footer={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
            gap: "10px",
          }}
        >
          <CustomButton
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </CustomButton>

          <CustomButton
            type="button"
            variant="danger"
            onClick={handleDeleteAll}
            loading={isSubmitting}
            disabled={!isFormValid || isSubmitting}
            icon={<CustomIcon name="Trash2" size={16} />}
          >
            Delete All Candidates
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleDeleteAll} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Warning Banner */}
        <div
          style={{
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div
            style={{
              color: "var(--accent-danger)",
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <CustomIcon name="AlertTriangle" size={22} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "var(--accent-danger)",
                letterSpacing: "0.02em",
              }}
            >
              CRITICAL ACTION: Danger Zone
            </span>
            <p
              style={{
                margin: 0,
                fontSize: "0.84rem",
                color: "var(--text-secondary)",
                lineHeight: 1.45,
              }}
            >
              You are about to delete <strong>all candidate profiles</strong>
              {typeof totalCandidates === "number" && totalCandidates > 0
                ? ` (${totalCandidates} active candidates)`
                : ""}
              , including their resumes, notes, and scheduled interview history.
              This operation <strong>cannot be undone</strong>.
            </p>
          </div>
        </div>

        {/* Step 1: Confirmation Input */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Type <span style={{ color: "var(--accent-danger)", fontWeight: 700 }}>DELETE</span> to confirm:
          </label>
          <CustomInput
            placeholder="Type DELETE"
            value={confirmationInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setConfirmationInput(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            autoComplete="off"
            containerStyle={{ width: "100%" }}
          />
        </div>

        {/* Step 2: Admin Password Verification */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 6,
            }}
          >
            Enter your Admin Password:
          </label>
          <CustomInput
            type={showPassword ? "text" : "password"}
            placeholder="Your administrator account password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            autoComplete="current-password"
            icon={<CustomIcon name="Lock" size={16} />}
            suffix={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <CustomIcon name={showPassword ? "EyeOff" : "Eye"} size={16} />
              </button>
            }
            containerStyle={{ width: "100%" }}
          />
        </div>

        {/* Error message alert */}
        {errorMsg && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.82rem",
              color: "var(--accent-danger)",
              background: "rgba(239, 68, 68, 0.08)",
              padding: "8px 12px",
              borderRadius: 6,
              border: "1px solid rgba(239, 68, 68, 0.2)",
            }}
          >
            <CustomIcon name="AlertCircle" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default DeleteAllCandidatesModal;
