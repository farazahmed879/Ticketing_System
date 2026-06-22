import React, { useState } from "react";
import Modal from "../../../components/Modal";
import CustomInput from "../../../components/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import styles from "../Messages.module.css";

interface AddGroupMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: any[];
  onlineUserIds: Set<string>;
  onAddMembers: (memberIds: string[]) => Promise<void>;
  existingMemberIds: string[];
}

const AddGroupMembersModal: React.FC<AddGroupMembersModalProps> = ({
  isOpen,
  onClose,
  users,
  onlineUserIds,
  onAddMembers,
  existingMemberIds,
}) => {
  const [userSearch, setUserSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleClose = () => {
    setUserSearch("");
    setSelectedMembers([]);
    onClose();
  };

  const handleToggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAdd = async () => {
    if (selectedMembers.length === 0) return;
    await onAddMembers(selectedMembers);
    handleClose();
  };

  // Filter out users already in the group
  const availableUsers = users.filter((u) => !existingMemberIds.includes(u.id));
  const filteredUsers = availableUsers.filter(
    (u) =>
      u.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Members to Group"
      maxWidth="520px"
      footer={
        <CustomButton
          variant="gradient"
          fullWidth
          disabled={selectedMembers.length === 0}
          onClick={handleAdd}
          style={{ padding: "12px", borderRadius: 10, fontWeight: 700 }}
        >
          Add {selectedMembers.length} member
          {selectedMembers.length > 1 ? "s" : ""}
        </CustomButton>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <CustomInput
          placeholder="Search new members..."
          value={userSearch}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setUserSearch(e.target.value)
          }
          icon={<CustomIcon name="Search" size={18} />}
        />
        {selectedMembers.length > 0 && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {selectedMembers.length} member
            {selectedMembers.length > 1 ? "s" : ""} selected
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
              const isSelected = selectedMembers.includes(u.id);
              return (
                <div
                  key={u.id}
                  className={styles.userSelectItem}
                  onClick={() => handleToggleMember(u.id)}
                  style={{
                    background: isSelected ? "rgba(124,58,237,0.1)" : undefined,
                    border: isSelected
                      ? "1px solid rgba(124,58,237,0.3)"
                      : "1px solid transparent",
                    borderRadius: 12,
                    cursor: "pointer",
                    padding: "10px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
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
              No available users found
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default AddGroupMembersModal;
