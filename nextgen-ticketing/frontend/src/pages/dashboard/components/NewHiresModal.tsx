import React from "react";
import Modal from "../../../components/Modal";
import { formatDistanceToNow } from "date-fns";
import styles from "../Dashboard.module.css";

interface NewHiresModalProps {
  isOpen: boolean;
  onClose: () => void;
  newHires: any[];
}

const NewHiresModal: React.FC<NewHiresModalProps> = ({ isOpen, onClose, newHires }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Our Growing Team"
      maxWidth="800px"
    >
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <p
          style={{
            fontSize: "1.2rem",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          Welcome to the Jami Partners family! 🎊
        </p>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 20,
          maxHeight: "60vh",
          overflowY: "auto",
          padding: "10px",
        }}
      >
        {newHires.map((hire) => (
          <div
            key={hire.id}
            className={`${styles.newHireCard} glass-card`}
            style={{
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              padding: "24px",
              height: "auto",
            }}
          >
            {hire.image ? (
              <img
                src={hire.image}
                alt={hire.fullname}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "24px",
                  marginBottom: 16,
                  objectFit: "cover",
                  border: "3px solid var(--border-glass)",
                }}
              />
            ) : (
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "24px",
                  background: `linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2rem",
                  fontWeight: 800,
                  margin: "0 auto 16px",
                  color: "white",
                  boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
                }}
              >
                {hire.fullname.charAt(0)}
              </div>
            )}
            <h4 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: 4 }}>
              {hire.fullname}
            </h4>
            <p
              style={{
                color: "var(--accent-primary)",
                fontWeight: 600,
                fontSize: "0.95rem",
                marginBottom: 4,
              }}
            >
              {hire.title || "Team Member"}
            </p>
            {hire.role?.name && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 10px",
                  borderRadius: 12,
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  color: "var(--accent-primary)",
                  background: "rgba(var(--accent-primary-rgb, 99, 102, 241), 0.12)",
                  border: "1px solid rgba(var(--accent-primary-rgb, 99, 102, 241), 0.25)",
                  marginBottom: 8,
                }}
              >
                {hire.role.name}
              </span>
            )}
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              Joined{" "}
              {formatDistanceToNow(new Date(hire.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default NewHiresModal;
