import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import CustomIcon from "../CustomIcon";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  /** Shown under the title (e.g. a status badge). */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Panel width on desktop; the drawer is full-width on phones. */
  width?: string;
  /** "right" (default) slides in from the side; "bottom" is a bottom sheet. */
  placement?: "right" | "bottom";
  /** Drop the body padding/scroll so the child manages its own layout. */
  flushContent?: boolean;
}

/** Panel that slides in from the right (or up from the bottom). Closes on overlay click or Escape. */
const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "480px",
  placement = "right",
  flushContent = false,
}) => {
  const isBottom = placement === "bottom";
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={`${styles.overlay} ${isBottom ? styles.overlayBottom : ""}`}
      onClick={onClose}
    >
      <aside
        className={`${styles.panel} ${isBottom ? styles.panelBottom : ""}`}
        style={isBottom ? undefined : { width }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {isBottom && <div className={styles.grabber} aria-hidden="true" />}
        <div className={styles.header}>
          <div className={styles.titleBlock}>
            {title && <h2>{title}</h2>}
            {subtitle}
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Close"
          >
            <CustomIcon name="X" size={20} />
          </button>
        </div>
        <div
          className={`${styles.content} ${
            flushContent ? styles.contentFlush : ""
          }`}
        >
          {children}
        </div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </aside>
    </div>,
    document.body,
  );
};

export default Drawer;
