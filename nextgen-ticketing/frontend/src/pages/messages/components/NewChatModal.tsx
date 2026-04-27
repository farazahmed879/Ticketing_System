import React from "react";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import styles from "../Messages.module.css";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  isCustomer: boolean;
  userSearch: string;
  onUserSearchChange: (val: string) => void;
  filteredUsers: any[];
  onStartChat: (userId: string) => void;
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  isCustomer,
  userSearch,
  onUserSearchChange,
  filteredUsers,
  onStartChat,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isCustomer ? "Contact Support" : "Start New Chat"}
      maxWidth="500px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <CustomInput
          placeholder="Search by name or email..."
          value={userSearch}
          onChange={(e) => onUserSearchChange(e.target.value)}
          icon={<CustomIcon name="Search" size={18} />}
        />
        <div
          style={{
            maxHeight: "400px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className={styles.userSelectItem}
                onClick={() => onStartChat(u.id)}
              >
                <div
                  className="glass-card"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    color: "var(--text-primary)",
                  }}
                >
                  {u.image ? (
                    <img
                      src={u.image}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <CustomIcon name="User" size={20} />
                  )}
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {u.fullname}
                    <span
                      style={{
                        fontSize: "0.7rem",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: u.role?.isAdmin
                          ? "rgba(239,68,68,0.1)"
                          : "rgba(59,130,246,0.1)",
                        color: u.role?.isAdmin ? "#ef4444" : "#3b82f6",
                        fontWeight: 700,
                        textTransform: "uppercase",
                      }}
                    >
                      {u.role?.name}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                  >
                    {u.email}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div
              style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}
            >
              No users found
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewChatModal;
