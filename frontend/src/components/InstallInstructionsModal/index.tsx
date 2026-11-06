import React from "react";
import Modal from "../Modal";
import CustomButton from "../CustomButton";
import CustomIcon from "../CustomIcon";
import styles from "./InstallInstructionsModal.module.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** "ios" = iPhone/iPad (any browser), "mac" = Safari on macOS */
  platform: "ios" | "mac";
}

interface Step {
  icon: string;
  text: React.ReactNode;
}

const STEPS: Record<Props["platform"], Step[]> = {
  ios: [
    {
      icon: "Share",
      text: (
        <>
          Tap the <strong>Share</strong> button — at the bottom of the screen on
          iPhone, or at the top on iPad.
        </>
      ),
    },
    {
      icon: "SquarePlus",
      text: (
        <>
          Scroll down and tap <strong>Add to Home Screen</strong>.
        </>
      ),
    },
    {
      icon: "CheckCircle2",
      text: (
        <>
          Tap <strong>Add</strong>. Jami Partners will open from your home
          screen like a normal app.
        </>
      ),
    },
  ],
  mac: [
    {
      icon: "AppWindow",
      text: (
        <>
          In the Safari menu bar, open <strong>File</strong> (or click the{" "}
          <strong>Share</strong> button in the toolbar).
        </>
      ),
    },
    {
      icon: "SquarePlus",
      text: (
        <>
          Choose <strong>Add to Dock</strong>.
        </>
      ),
    },
    {
      icon: "CheckCircle2",
      text: (
        <>
          Click <strong>Add</strong>. Jami Partners will open from your Dock in
          its own window.
        </>
      ),
    },
  ],
};

const InstallInstructionsModal: React.FC<Props> = ({ isOpen, onClose, platform }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={platform === "ios" ? "Add to Home Screen" : "Add to Dock"}
    maxWidth="440px"
    footer={
      <CustomButton variant="primary" onClick={onClose}>
        Got it
      </CustomButton>
    }
  >
    <p className={styles.intro}>
      Safari doesn't have an install button, but you can add the app in a few
      taps:
    </p>
    <ol className={styles.steps}>
      {STEPS[platform].map((step, i) => (
        <li key={i} className={styles.step}>
          <span className={styles.stepIcon} aria-hidden="true">
            <CustomIcon name={step.icon} size={18} />
          </span>
          <span className={styles.stepText}>
            <span className={styles.stepNo}>Step {i + 1}</span>
            <span>{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
    {platform === "mac" && (
      <p className={styles.note}>Needs Safari 17 or later (macOS Sonoma).</p>
    )}
  </Modal>
);

export default InstallInstructionsModal;
