import React from "react";
import Modal from "../../../components/Modal";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import styles from "../Messages.module.css";
import CustomImage from "../../../components/CustomImage";

interface ViewGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  onlineUserIds: Set<string>;
  canManageGroup?: boolean;
  onAddMemberClick?: () => void;
}

const ViewGroupMembersModal: React.FC<ViewGroupMembersModalProps> = ({
  isOpen,
  onClose,
  members,
  onlineUserIds,
  canManageGroup,
  onAddMemberClick,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Group Members (${members.length})`}
      maxWidth="480px"
      footer={
        canManageGroup && onAddMemberClick ? (
          <CustomButton
            variant="gradient"
            fullWidth
            onClick={() => {
              onClose();
              onAddMemberClick();
            }}
            style={{ padding: "12px", borderRadius: 10, fontWeight: 600, display: "flex", gap: "8px", alignItems: "center", justifyContent: "center" }}
          >
            <CustomIcon name="UserPlus" size={18} />
            Add Members to Group
          </CustomButton>
        ) : undefined
      }
    >
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {members.map((member) => (
          <div
            key={member.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px",
              borderRadius: "12px",
              background: "rgba(124, 58, 237, 0.05)",
            }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
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
                {member.image ? (
                  <CustomImage
                    src={member.image}
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
              {onlineUserIds.has(member.id) && (
                <span className={styles.onlineDot} />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}
              >
                {member.fullname}
                {onlineUserIds.has(member.id) && (
                  <span className={styles.onlineTag}>Online</span>
                )}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {member.role?.name || "Member"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ViewGroupMembersModal;
