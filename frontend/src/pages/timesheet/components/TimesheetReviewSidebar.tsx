import React from "react";
import CustomInput from "../../../components/CustomInput/CustomInput";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import CustomImage from "../../../components/CustomImage";

import type { TimesheetReviewSidebarProps } from "../types";
import styles from "../Timesheet.module.css";

export const TimesheetReviewSidebar: React.FC<TimesheetReviewSidebarProps> = ({
  userSearch,
  setUserSearch,
  filteredUsers,
  selectedUserId,
  setSelectedUserId,
  pendingCounts,
  unfilledData,
}) => {
  const unfilledCount = unfilledData?.unfilledUserIds?.length || 0;

  return (
    <>
      <div className={styles.rvSideHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CustomIcon name="Users" size={20} color="var(--accent-primary)" />
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            Team Members
          </h3>
        </div>
        {unfilledCount > 0 && (
          <div
            title={`${unfilledCount} user(s) have not filled timesheet since Nov 1, 2026`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "#ef4444",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              padding: "2px 8px",
              borderRadius: 12,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#ef4444",
                boxShadow: "0 0 6px #ef4444",
              }}
            />
            {unfilledCount} Unfilled
          </div>
        )}
      </div>

      <div className={styles.rvSideSearch}>
        <CustomInput
          placeholder="Search members..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          icon={
            <CustomIcon name="Search" size={16} color="var(--text-muted)" />
          }
        />
      </div>

      {/* On narrow screens this block turns into a horizontal user picker
          (see .rvSidePicker in Timesheet.module.css). */}
      <div className={styles.rvSidePicker}>
        <CustomButton
          onClick={() => setSelectedUserId(null)}
          variant="ghost"
          className={styles.rvSideUserBtn}
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

        <div className={styles.rvSideList}>
          {filteredUsers.map((u: any) => {
            const isUnfilled = unfilledData?.unfilledUserIds?.includes(u.id);
            const missingInfo = unfilledData?.userMissingDays?.[u.id];

            return (
              <CustomButton
                key={u.id}
                onClick={() => setSelectedUserId(u.id)}
                variant="ghost"
                className={styles.rvSideUserBtn}
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
                      : isUnfilled
                        ? "rgba(239, 68, 68, 0.2)"
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
                {/* Avatar with Red Circle Indication Badge */}
                <div style={{ position: "relative", flexShrink: 0 }}>
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
                      border: isUnfilled
                        ? "1px solid rgba(239, 68, 68, 0.6)"
                        : "1px solid var(--border-glass)",
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
                        {u.fullname?.charAt(0) || "U"}
                      </span>
                    )}
                  </div>
                  {/* Red Circle Indicator on Avatar */}
                  {isUnfilled && (
                    <span
                      title={`Timesheet not filled (${missingInfo?.count || 1} day${(missingInfo?.count || 1) > 1 ? "s" : ""} missing since Nov 1, 2026)`}
                      style={{
                        position: "absolute",
                        top: -2,
                        right: -2,
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: "#ef4444",
                        border: "2px solid var(--bg-card, #1e1e2d)",
                        boxShadow: "0 0 6px rgba(239, 68, 68, 0.9)",
                        zIndex: 2,
                      }}
                    />
                  )}
                </div>

                <div className={styles.rvSideUserInfo}>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div
                      className={styles.rvSideUserName}
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
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {u.role?.name}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      flexShrink: 0,
                    }}
                  >
                    {/* Red circle tag with missing days count */}
                    {isUnfilled && (
                      <div
                        title={`Timesheet not filled (${missingInfo?.count || 1} working day${(missingInfo?.count || 1) > 1 ? "s" : ""} missing since Nov 1, 2026)`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          background: "rgba(239, 68, 68, 0.12)",
                          border: "1px solid rgba(239, 68, 68, 0.35)",
                          borderRadius: 10,
                          padding: "2px 6px",
                        }}
                      >
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: "50%",
                            background: "#ef4444",
                            boxShadow: "0 0 5px #ef4444",
                            display: "inline-block",
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            color: "#ef4444",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {missingInfo?.count}d
                        </span>
                      </div>
                    )}

                    {/* Pending review count badge */}
                    {pendingCounts && pendingCounts[u.id] > 0 && (
                      <div
                        title={`${pendingCounts[u.id]} pending review`}
                        style={{
                          background: "var(--accent-warning)",
                          color: "#fff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 10,
                        }}
                      >
                        {pendingCounts[u.id]}
                      </div>
                    )}
                  </div>
                </div>

                {selectedUserId === u.id && (
                  <div
                    className={styles.rvSideSelectedDot}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "var(--accent-primary)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </CustomButton>
            );
          })}
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
