import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Modal from "../../../components/Modal";
import CustomButton from "../../../components/CustomButton";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import { useNotification } from "../../../context/NotificationContext";
import type { DeleteAllCandidatesModalProps } from "./deleteAllCandidates.types";
import { DELETE_ALL_CANDIDATES } from "./deleteAllCandidates.constants";
import styles from "./DeleteAllCandidatesModal.module.css";

const DeleteAllCandidatesModal: React.FC<DeleteAllCandidatesModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  totalCandidates,
}) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { runBackgroundTask } = useNotification();

  const isConfirmationMatched =
    confirmationInput.trim().toUpperCase() ===
    DELETE_ALL_CANDIDATES.REQUIRED_CONFIRMATION;
  const isFormValid = isConfirmationMatched && password.trim().length > 0;

  const handleClose = () => {
    setConfirmationInput("");
    setPassword("");
    setShowPassword(false);
    setErrorMsg(null);
    onClose();
  };

  const handleDeleteAll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const trimmedPassword = password.trim();

    handleClose();
    navigate(DELETE_ALL_CANDIDATES.DASHBOARD_PATH);

    runBackgroundTask(
      DELETE_ALL_CANDIDATES.TASK_TITLE,
      async () => {
        const response = await api.post(API_ROUTES.CANDIDATES.DELETE_ALL, {
          password: trimmedPassword,
        });

        const deletedCount = response.data?.count ?? totalCandidates ?? 0;
        return (
          response.data?.message ||
          DELETE_ALL_CANDIDATES.getSuccessMessage(deletedCount)
        );
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ["candidates"] });
        onSuccess(totalCandidates || 0);
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={DELETE_ALL_CANDIDATES.MODAL_TITLE}
      maxWidth={DELETE_ALL_CANDIDATES.MODAL_MAX_WIDTH}
      footer={
        <div className={styles.modalFooter}>
          <CustomButton
            type="button"
            variant="secondary"
            onClick={handleClose}
          >
            {DELETE_ALL_CANDIDATES.CANCEL_BTN_TEXT}
          </CustomButton>

          <CustomButton
            type="button"
            variant="danger"
            onClick={handleDeleteAll}
            disabled={!isFormValid}
            icon={<CustomIcon name="Trash2" size={16} />}
          >
            {DELETE_ALL_CANDIDATES.CONFIRM_BTN_TEXT}
          </CustomButton>
        </div>
      }
    >
      <form onSubmit={handleDeleteAll} className={styles.form}>
        <div className={styles.warningBanner}>
          <div className={styles.warningIcon}>
            <CustomIcon name="AlertTriangle" size={22} />
          </div>
          <div className={styles.warningContent}>
            <span className={styles.warningTitle}>
              {DELETE_ALL_CANDIDATES.DANGER_ZONE_TITLE}
            </span>
            <p className={styles.warningDesc}>
              {DELETE_ALL_CANDIDATES.WARNING_PREFIX}{" "}
              <strong>{DELETE_ALL_CANDIDATES.PROFILES_TARGET}</strong>
              {typeof totalCandidates === "number" && totalCandidates > 0
                ? ` (${totalCandidates} ${DELETE_ALL_CANDIDATES.ACTIVE_SUFFIX})`
                : ""}
              {DELETE_ALL_CANDIDATES.WARNING_BODY}{" "}
              <strong>{DELETE_ALL_CANDIDATES.CANNOT_BE_UNDONE}</strong>
            </p>
          </div>
        </div>

        <div>
          <label className={styles.fieldLabel}>
            {DELETE_ALL_CANDIDATES.CONFIRM_LABEL_PREFIX}{" "}
            <span className={styles.highlightText}>
              {DELETE_ALL_CANDIDATES.REQUIRED_CONFIRMATION}
            </span>{" "}
            {DELETE_ALL_CANDIDATES.CONFIRM_LABEL_SUFFIX}
          </label>
          <CustomInput
            placeholder={DELETE_ALL_CANDIDATES.getConfirmPlaceholder(
              DELETE_ALL_CANDIDATES.REQUIRED_CONFIRMATION
            )}
            value={confirmationInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setConfirmationInput(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            autoComplete="off"
            className={styles.inputField}
          />
        </div>

        <div>
          <label className={styles.fieldLabel}>
            {DELETE_ALL_CANDIDATES.PASSWORD_LABEL}
          </label>
          <CustomInput
            type={showPassword ? "text" : "password"}
            placeholder={DELETE_ALL_CANDIDATES.PASSWORD_PLACEHOLDER}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setPassword(e.target.value);
              if (errorMsg) setErrorMsg(null);
            }}
            autoComplete="current-password"
            icon={<CustomIcon name="Lock" size={16} />}
            suffix={
              <span
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggle}
                title={
                  showPassword
                    ? DELETE_ALL_CANDIDATES.HIDE_PASSWORD_TITLE
                    : DELETE_ALL_CANDIDATES.SHOW_PASSWORD_TITLE
                }
              >
                <CustomIcon name={showPassword ? "EyeOff" : "Eye"} size={16} />
              </span>
            }
            className={styles.inputField}
          />
        </div>

        {errorMsg && (
          <div className={styles.errorAlert}>
            <CustomIcon name="AlertCircle" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>
    </Modal>
  );
};

export default DeleteAllCandidatesModal;
