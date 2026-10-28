import React, { useState } from "react";
import Modal from "../Modal";
import CustomInput from "../CustomInput";
import CustomButton from "../CustomButton";
import CustomIcon from "../CustomIcon";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import api from "../../services/api";
import type { ChangeDefaultPasswordModalProps } from "./types";
import {
  PASSWORD_VALIDATION,
  CHANGE_PASSWORD_UI_TEXT,
  PASSWORD_ERROR_MESSAGES,
  calculatePasswordStrength,
} from "./constants";
import styles from "./ChangeDefaultPasswordModal.module.css";

export const ChangeDefaultPasswordModal: React.FC<
  ChangeDefaultPasswordModalProps
> = ({ isOpen, onClose }) => {
  const { updateUser } = useAuth();
  const { showNotification } = useNotification();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const strength = calculatePasswordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword) {
      setError(PASSWORD_ERROR_MESSAGES.CURRENT_REQUIRED);
      return;
    }

    if (newPassword.length < PASSWORD_VALIDATION.MIN_LENGTH) {
      setError(PASSWORD_ERROR_MESSAGES.MIN_LENGTH);
      return;
    }

    if (newPassword === PASSWORD_VALIDATION.FORBIDDEN_DEFAULT_PASSWORD) {
      setError(PASSWORD_ERROR_MESSAGES.CANNOT_BE_DEFAULT);
      return;
    }

    if (currentPassword === newPassword) {
      setError(PASSWORD_ERROR_MESSAGES.CANNOT_MATCH_CURRENT);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(PASSWORD_ERROR_MESSAGES.PASSWORDS_MISMATCH);
      return;
    }

    setLoading(true);
    try {
      await api.post("/users/profile/password", {
        currentPassword,
        newPassword,
      });

      updateUser({ mustChangePassword: false });
      showNotification("success", PASSWORD_ERROR_MESSAGES.SUCCESS);

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        PASSWORD_ERROR_MESSAGES.GENERIC_UPDATE_ERROR;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={CHANGE_PASSWORD_UI_TEXT.MODAL_TITLE}
      maxWidth={CHANGE_PASSWORD_UI_TEXT.MODAL_MAX_WIDTH}
    >
      <div className={styles.container}>
        <div className={styles.headerNotice}>
          <div className={styles.noticeIcon}>
            <CustomIcon name="ShieldAlert" size={22} />
          </div>
          <div className={styles.noticeText}>
            <div className={styles.noticeTitle}>
              {CHANGE_PASSWORD_UI_TEXT.NOTICE_TITLE}
            </div>
            <div className={styles.noticeDesc}>
              {CHANGE_PASSWORD_UI_TEXT.NOTICE_DESC}
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <CustomIcon name="AlertCircle" size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <CustomInput
            label={CHANGE_PASSWORD_UI_TEXT.CURRENT_PASSWORD_LABEL}
            type={showCurrent ? "text" : "password"}
            placeholder={CHANGE_PASSWORD_UI_TEXT.CURRENT_PASSWORD_PLACEHOLDER}
            value={currentPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setCurrentPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="current-password"
            icon={<CustomIcon name="Lock" size={16} />}
            suffix={
              <span
                className={styles.suffixToggle}
                onClick={() => setShowCurrent(!showCurrent)}
                title={
                  showCurrent
                    ? CHANGE_PASSWORD_UI_TEXT.HIDE_PASSWORD_TITLE
                    : CHANGE_PASSWORD_UI_TEXT.SHOW_PASSWORD_TITLE
                }
              >
                <CustomIcon
                  name={showCurrent ? "EyeOff" : "Eye"}
                  size={16}
                />
              </span>
            }
            className={styles.inputContainer}
            required
          />

          <CustomInput
            label={CHANGE_PASSWORD_UI_TEXT.NEW_PASSWORD_LABEL}
            type={showNew ? "text" : "password"}
            placeholder={CHANGE_PASSWORD_UI_TEXT.getNewPasswordPlaceholder(
              PASSWORD_VALIDATION.MIN_LENGTH
            )}
            value={newPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setNewPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="new-password"
            icon={<CustomIcon name="KeyRound" size={16} />}
            suffix={
              <span
                className={styles.suffixToggle}
                onClick={() => setShowNew(!showNew)}
                title={
                  showNew
                    ? CHANGE_PASSWORD_UI_TEXT.HIDE_PASSWORD_TITLE
                    : CHANGE_PASSWORD_UI_TEXT.SHOW_PASSWORD_TITLE
                }
              >
                <CustomIcon name={showNew ? "EyeOff" : "Eye"} size={16} />
              </span>
            }
            className={styles.inputContainer}
            required
          />

          {newPassword && (
            <div className={styles.strengthBar}>
              {[1, 2, 3, 4].map((level) => {
                const isActive = strength.score >= level;
                const levelClass =
                  isActive && strength.level
                    ? styles[`segmentLevel_${strength.level}`]
                    : "";
                return (
                  <div
                    key={level}
                    className={`${styles.strengthSegment} ${levelClass}`}
                  />
                );
              })}
              <span
                className={`${styles.strengthLabel} ${
                  strength.level ? styles[`label_${strength.level}`] : ""
                }`}
              >
                {strength.label}
              </span>
            </div>
          )}

          <CustomInput
            label={CHANGE_PASSWORD_UI_TEXT.CONFIRM_PASSWORD_LABEL}
            type={showConfirm ? "text" : "password"}
            placeholder={CHANGE_PASSWORD_UI_TEXT.CONFIRM_PASSWORD_PLACEHOLDER}
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setConfirmPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="new-password"
            icon={<CustomIcon name="CheckCircle2" size={16} />}
            suffix={
              <span
                className={styles.suffixToggle}
                onClick={() => setShowConfirm(!showConfirm)}
                title={
                  showConfirm
                    ? CHANGE_PASSWORD_UI_TEXT.HIDE_PASSWORD_TITLE
                    : CHANGE_PASSWORD_UI_TEXT.SHOW_PASSWORD_TITLE
                }
              >
                <CustomIcon
                  name={showConfirm ? "EyeOff" : "Eye"}
                  size={16}
                />
              </span>
            }
            className={styles.inputContainer}
            required
          />

          <div className={styles.actions}>
            <CustomButton
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {CHANGE_PASSWORD_UI_TEXT.REMIND_LATER_BTN}
            </CustomButton>
            <CustomButton
              type="submit"
              variant="primary"
              loading={loading}
              icon={<CustomIcon name="Check" size={16} />}
            >
              {CHANGE_PASSWORD_UI_TEXT.UPDATE_BTN}
            </CustomButton>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ChangeDefaultPasswordModal;
