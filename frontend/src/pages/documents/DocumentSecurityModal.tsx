import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { formatDate } from "../../utils/helpers";
import { VAULT_QUERY_KEY, apiErrorMessage, type VaultStatus } from "./documentApi";
import styles from "./Documents.module.css";

type Mode = "setup" | "unlock" | "change";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultStatus;
}

/**
 * Document passphrase: set it up, unlock documents after a server restart,
 * change it, or lock documents now. Only Admin / Sub Admin get here.
 */
const DocumentSecurityModal: React.FC<Props> = ({ isOpen, onClose, vault }) => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const initialMode: Mode =
    vault.state === "not_set_up" ? "setup" : vault.state === "locked" ? "unlock" : "change";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close the popup first, as soon as the server confirms the change.
  const done = (status: VaultStatus, message: string) => {
    onClose();
    showNotification("success", message);
    queryClient.setQueryData(VAULT_QUERY_KEY, status);
    // Documents that failed to open while locked can load now.
    queryClient.invalidateQueries({ queryKey: ["hr-document"] });
  };

  const submit = useMutation({
    mutationFn: async (): Promise<VaultStatus> => {
      if (mode === "unlock") {
        return (await api.post(API_ROUTES.DOCUMENTS.VAULT_UNLOCK, { passphrase: current })).data;
      }
      if (next.trim().length < vault.minLength) {
        throw new Error(`The passphrase must be at least ${vault.minLength} characters long`);
      }
      if (next !== confirm) throw new Error("The passphrases don't match");
      if (mode === "setup") {
        return (await api.post(API_ROUTES.DOCUMENTS.VAULT_SETUP, { passphrase: next })).data;
      }
      return (
        await api.post(API_ROUTES.DOCUMENTS.VAULT_CHANGE, {
          currentPassphrase: current,
          newPassphrase: next,
        })
      ).data;
    },
    onSuccess: (status) =>
      done(
        status,
        mode === "setup"
          ? "Document passphrase set. Documents are now encrypted and unlocked."
          : mode === "unlock"
            ? "Documents unlocked"
            : "Document passphrase changed",
      ),
    onError: (err) =>
      setError(apiErrorMessage(err, (err as Error).message || "Something went wrong")),
  });

  const lock = useMutation({
    mutationFn: async () => (await api.post(API_ROUTES.DOCUMENTS.VAULT_LOCK)).data as VaultStatus,
    onSuccess: (status) => done(status, "Documents locked"),
    onError: (err) => setError(apiErrorMessage(err, "Could not lock documents")),
  });

  const field = (
    label: string,
    value: string,
    set: (v: string) => void,
    placeholder: string,
    autoFocus = false,
  ) => (
    <CustomInput
      label={label}
      type={show ? "text" : "password"}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      autoComplete="off"
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        set(e.target.value);
        if (error) setError(null);
      }}
    />
  );

  const unlockedInfo = [
    vault.unlockedByName && `by ${vault.unlockedByName}`,
    vault.unlockedAt && formatDate(vault.unlockedAt),
  ]
    .filter(Boolean)
    .join(", ");

  const title =
    mode === "setup"
      ? "Set document passphrase"
      : mode === "unlock"
        ? "Unlock documents"
        : "Document security";

  const footer = (
    <div className={styles.modalFooter}>
      {vault.state === "unlocked" && (
        <CustomButton
          variant="outline"
          icon={<CustomIcon name="Lock" size={16} />}
          onClick={() => lock.mutate()}
          loading={lock.isPending}
        >
          Lock now
        </CustomButton>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        <CustomButton variant="ghost" onClick={onClose}>
          Cancel
        </CustomButton>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name={mode === "unlock" ? "LockOpen" : "KeyRound"} size={16} />}
          onClick={() => submit.mutate()}
          loading={submit.isPending}
        >
          {mode === "setup" ? "Set passphrase" : mode === "unlock" ? "Unlock" : "Change passphrase"}
        </CustomButton>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="520px" footer={footer}>
      <form
        className={styles.securityForm}
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
      >
        {mode === "setup" && (
          <>
            <p className={styles.securityNote}>
              Salary, bank and other document details are encrypted with a key that only this
              passphrase can unlock. It isn't stored anywhere in the system, so developers and
              database or server access can't read documents.
            </p>
            <p className={`${styles.securityNote} ${styles.securityWarning}`}>
              <CustomIcon name="TriangleAlert" size={16} />
              Share it only with Admins and Sub Admins and keep it somewhere safe. If it's
              forgotten, encrypted documents can never be opened again. After every server
              restart, an Admin or Sub Admin must unlock documents with it.
            </p>
          </>
        )}
        {mode === "unlock" && (
          <p className={styles.securityNote}>
            Documents lock whenever the server restarts. Until they're unlocked, nobody
            (employees included) can open documents and new ones can't be issued.
          </p>
        )}
        {mode === "change" && (
          <p className={styles.securityNote}>
            {`Documents are unlocked${unlockedInfo ? ` (${unlockedInfo})` : ""}. Passphrase last set${
              vault.setByName ? ` by ${vault.setByName}` : ""
            }${vault.setAt ? ` on ${formatDate(vault.setAt)}` : ""}.`}
          </p>
        )}

        {(mode === "unlock" || mode === "change") &&
          field(
            mode === "unlock" ? "Document passphrase" : "Current passphrase",
            current,
            setCurrent,
            "Enter the passphrase",
            true,
          )}
        {(mode === "setup" || mode === "change") && (
          <>
            {field(
              "New passphrase",
              next,
              setNext,
              `At least ${vault.minLength} characters`,
              mode === "setup",
            )}
            {field("Confirm new passphrase", confirm, setConfirm, "Type it again")}
          </>
        )}

        <label className={styles.securityShow}>
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passphrase
        </label>
        {error && <p className={styles.error}>{error}</p>}
        {/* Enter submits the form */}
        <button type="submit" hidden />
      </form>
      {vault.state === "unlocked" && mode === "change" && (
        <p className={styles.securityNote} style={{ marginTop: 8 }}>
          Changing the passphrase doesn't re-encrypt documents; the old passphrase simply stops
          working.
        </p>
      )}
      {vault.state === "locked" && mode === "unlock" && (
        <CustomButton variant="ghost" size="sm" onClick={() => setMode("change")}>
          Change the passphrase instead
        </CustomButton>
      )}
    </Modal>
  );
};

export default DocumentSecurityModal;
