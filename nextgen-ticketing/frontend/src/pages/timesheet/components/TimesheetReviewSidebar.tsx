import React from "react";
import CustomInput from "../../../components/CustomInput/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomImage from "../../../components/CustomImage";

export interface TimesheetReviewSidebarProps {
  userSearch: string;
  setUserSearch: (v: string) => void;
  filteredUsers: any[];
  selectedUserId: string | null;
  setSelectedUserId: (v: string | null) => void;
}

export const TimesheetReviewSidebar: React.FC<TimesheetReviewSidebarProps> = ({
  userSearch,
  setUserSearch,
  filteredUsers,
  selectedUserId,
  setSelectedUserId,
}) => {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 20,
        }}
      >
        <CustomIcon name="Users" size={20} color="var(--accent-primary)" />
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
          Team Members
        </h3>
      </div>

      <div style={{ marginBottom: 16 }}>
        <CustomInput
          placeholder="Search members..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          icon={
            <CustomIcon name="Search" size={16} color="var(--text-muted)" />
          }
        />
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <CustomButton
          onClick={() => setSelectedUserId(null)}
          variant="ghost"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px",
            borderRadius: 12,
            border: "1px solid",
            borderColor:
              selectedUserId === null ? "var(--accent-primary)" : "transparent",
            background:
              selectedUserId === null
                ? "rgba(124, 58, 237, 0.1)"
                : "rgba(255,255,255,0.02)",
            color:
              selectedUserId === null
                ? "var(--accent-primary)"
                : "var(--text-primary)",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s",
            marginBottom: 4,
            width: "100%",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.05)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CustomIcon name="LayoutGrid" size={16} />
          </div>
          <span style={{ fontWeight: 600 }}>All Users</span>
        </CustomButton>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            paddingRight: 8,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {filteredUsers.map((u: any) => (
            <CustomButton
              key={u.id}
              onClick={() => setSelectedUserId(u.id)}
              variant="ghost"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid",
                borderColor:
                  selectedUserId === u.id
                    ? "var(--accent-primary)"
                    : "transparent",
                background:
                  selectedUserId === u.id
                    ? "rgba(124, 58, 237, 0.1)"
                    : "transparent",
                color:
                  selectedUserId === u.id
                    ? "var(--accent-primary)"
                    : "var(--text-secondary)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                width: "100%",
                justifyContent: "flex-start",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "rgba(255,255,255,0.05)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-glass)",
                }}
              >
                {u.image ? (
                  <CustomImage
                    src={u.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                    {u.fullname.charAt(0)}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {u.fullname}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                  {u.role?.name}
                </div>
              </div>
              {selectedUserId === u.id && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent-primary)",
                  }}
                />
              )}
            </CustomButton>
          ))}
          {filteredUsers.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: "20px",
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              No members found
            </div>
          )}
        </div>
      </div>
    </>
  );
};
