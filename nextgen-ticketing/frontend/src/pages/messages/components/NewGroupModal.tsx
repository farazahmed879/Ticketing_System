import React from "react";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import styles from "../Messages.module.css";

interface NewGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  onGroupNameChange: (val: string) => void;
  userSearch: string;
  onUserSearchChange: (val: string) => void;
  filteredUsers: any[];
  onlineUserIds: Set<string>;
  selectedGroupMembers: string[];
  onToggleMember: (userId: string) => void;
  onCreateGroup: () => Promise<void>;
}

const NewGroupModal: React.FC<NewGroupModalProps> = ({
  isOpen,
  onClose,
  groupName,
  onGroupNameChange,
  userSearch,
  onUserSearchChange,
  filteredUsers,
  onlineUserIds,
  selectedGroupMembers,
  onToggleMember,
  onCreateGroup,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Group Chat"
      maxWidth="520px"
      footer={
        <CustomButton
          variant="gradient"
          fullWidth
          disabled={!groupName.trim() || selectedGroupMembers.length === 0}
          onClick={onCreateGroup}
          style={{ padding: "12px", borderRadius: 10, fontWeight: 700 }}
        >
          Create Group ({selectedGroupMembers.length} members)
        </CustomButton>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <CustomInput
          placeholder="Group name..."
          value={groupName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onGroupNameChange(e.target.value)
          }
          icon={<CustomIcon name="Users" size={18} />}
        />
        <CustomInput
          placeholder="Search members..."
          value={userSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onUserSearchChange(e.target.value)
          }
          icon={<CustomIcon name="Search" size={18} />}
        />
        {selectedGroupMembers.length > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {selectedGroupMembers.length} member
            {selectedGroupMembers.length > 1 ? "s" : ""} selected
          </div>
        )}
        <div
          style={{
            maxHeight: "320px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => {
              const isSelected = selectedGroupMembers.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={styles.userSelectItem}
                  onClick={() => onToggleMember(u.id)}
                  style={{
                    background: isSelected ? "rgba(124,58,237,0.1)" : undefined,
                    border: isSelected
                      ? "1px solid rgba(124,58,237,0.3)"
                      : "1px solid transparent",
                    borderRadius: 12,
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
                    {onlineUserIds.has(u.id) && (
                      <span className={styles.onlineDot} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {u.fullname}
                      {onlineUserIds.has(u.id) && (
                        <span className={styles.onlineTag}>Online</span>
                      )}
                    </div>
                    <div
                      style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                    >
                      {u.role?.name}
                    </div>
                  </div>
                  {isSelected && (
                    <CustomIcon
                      name="Check"
                      size={18}
                      color="var(--accent-primary)"
                    />
                  )}
                </div>
              );
            })
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: 20,
                color: "var(--text-muted)",
              }}
            >
              No users found
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default NewGroupModal;
