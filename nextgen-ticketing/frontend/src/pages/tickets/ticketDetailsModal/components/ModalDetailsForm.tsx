import React from "react";
import CustomIcon from "../../../../components/CustomIcon";
import CustomSelect from "../../../../components/CustomSelect";
import CustomButton from "../../../../components/CustomButton";
import CustomBadge from "../../../../components/CustomBadge";
import CustomTextArea from "../../../../components/CustomTextArea";
import CustomDatePicker from "../../../../components/CustomDatePicker";
import { RoleName, StatusName } from "../../../../utils/constants";
import type { TicketDetail, TicketUpdateFormData } from "../../../../types";
import type { Control, UseFormSetValue, UseFormWatch } from "react-hook-form";

interface ModalDetailsFormProps {
  control: Control<TicketUpdateFormData>;
  setValue: UseFormSetValue<TicketUpdateFormData>;
  watch: UseFormWatch<TicketUpdateFormData>;
  formState: any;
  displayTicket: TicketDetail | any;
  users: any[];
  qaList: any[];
  priorities: any[];
  statuses: any[];
  isDisbaledMode: boolean;
  canEditContent: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  canAssignQA: boolean;
  isClient: boolean;
  isTicketOwner: boolean;
  user: any;
  handleStartChat: (userId: string) => void;
  onClose: () => void;
  navigate: (path: string) => void;
  fullTicketData: any;
}

const ModalDetailsForm: React.FC<ModalDetailsFormProps> = ({
  control,
  setValue,
  watch,
  displayTicket,
  users,
  qaList,
  priorities,
  statuses,
  isDisbaledMode,
  canEditContent,
  canUpdate,
  canAssign,
  canAssignQA,
  isClient,
  user,
  handleStartChat,
  onClose,
  navigate,
  fullTicketData,
}) => {
  const getStatusOptions = (columns: any[]) => {
    return columns.map((s: any) => ({
      value: s.id,
      label: s.name,
      icon: <CustomIcon name="Clock" size={14} color={s.color} />,
      disabled: !(
        user?.role?.name === RoleName.ADMIN ||
        user?.role?.permissions?.boardStatuses?.[s.id] === true ||
        (displayTicket.owner.id === user?.id &&
          (s.name.toLowerCase() === StatusName.OPEN.toLowerCase() ||
            s.name.toLowerCase() === StatusName.TRASH.toLowerCase() ||
            s.name.toLowerCase() === StatusName.FAILED.toLowerCase()))
      ),
    }));
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
        }}
      >
        <CustomIcon
          name="FolderKanban"
          size={16}
          color="var(--accent-primary)"
        />
        <span style={{ fontWeight: 600 }}>Project:</span>
        <span style={{ color: "var(--text-primary)" }}>
          {displayTicket.project?.name || "None"}
        </span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {/* Header Badges */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "nowrap",
            alignItems: "center",
          }}
        >
          {user?.role?.name !== RoleName.CUSTOMER ? (
            <CustomSelect
              name="priorityId"
              control={control}
              options={priorities.map((p) => ({
                value: p.id,
                label: p.name,
                icon: <CustomIcon name="Tag" size={14} color={p.color} />,
              }))}
              style={{
                minWidth: 140,
                fontSize: "0.8rem",
              }}
              disabled={isDisbaledMode}
            />
          ) : (
            <CustomBadge
              color={displayTicket.priority.color}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
              }}
            >
              <CustomIcon name="Tag" size={16} /> {displayTicket.priority.name}
            </CustomBadge>
          )}
          {user?.role?.name !== RoleName.CUSTOMER &&
          !(
            user?.role?.name === RoleName.EMPLOYEE &&
            displayTicket?.status?.name === StatusName.APPROVED
          ) ? (
            <CustomSelect
              name="statusId"
              control={control}
              options={getStatusOptions(statuses)}
              style={{
                minWidth: 180,
                fontSize: "0.8rem",
              }}
              disabled={isDisbaledMode}
            />
          ) : (
            <CustomBadge
              color={displayTicket.status.color}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: "0.8rem",
              }}
            >
              <CustomIcon name="Status" size={16} /> {displayTicket.status.name}
            </CustomBadge>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <CustomButton
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/tickets/${displayTicket.id}`);
            }}
            icon={<CustomIcon name="Maximize2" size={16} />}
            style={{
              color: "var(--accent-primary)",
              border: "1px solid var(--accent-primary)30",
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        <CustomTextArea
          name="issue"
          control={control}
          label={
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CustomIcon name="Info" size={16} color="var(--accent-primary)" />
              <span>Description</span>
            </div>
          }
          disabled={!canEditContent || isDisbaledMode}
          placeholder={
            canEditContent ? "Add a description..." : "No description provided"
          }
          rows={6}
          containerStyle={{ height: "100%" }}
          style={{
            background: "rgba(255,255,255,0.02)",
            fontSize: "0.95rem",
            cursor: !canEditContent ? "not-allowed" : "text",
            resize: !canEditContent ? "none" : "vertical",
            height: "100%",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CustomIcon name="User" size={18} color="var(--accent-primary)" />{" "}
              Reporter
            </label>
            <div
              className="glass-card"
              style={{
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 64,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-glass)",
                borderRadius: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "rgba(124, 58, 237, 0.1)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: "1rem",
                  flexShrink: 0,
                }}
              >
                {displayTicket.owner.fullname.charAt(0)}
              </div>
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: "0.9rem",
                    color: "var(--text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {displayTicket.owner.fullname}
                  {displayTicket.owner.id !== user?.id &&
                    (displayTicket.status.name.toLowerCase() ===
                      StatusName.OPEN.toLowerCase() ||
                      displayTicket.status.name.toLowerCase() ===
                        StatusName.TRASH.toLowerCase()) && (
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStartChat(displayTicket.owner.id)}
                        icon={<CustomIcon name="MessageSquare" size={14} />}
                        title="Chat with Reporter"
                        style={{
                          padding: 0,
                          minHeight: "auto",
                          color: "var(--accent-primary)",
                        }}
                      />
                    )}
                </div>
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {fullTicketData?.owner?.title || "Staff Member"}
                </div>
              </div>
            </div>
          </div>

          <CustomDatePicker
            name="dueDate"
            control={control}
            label={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <CustomIcon
                  name="Clock"
                  size={18}
                  color="var(--accent-primary)"
                />
                <span>Due Date</span>
              </div>
            }
            min={new Date().toISOString().split("T")[0]}
            disabled={!canUpdate || isDisbaledMode || isClient}
          />

          {/* Assignment */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CustomIcon
                name="UserPlus"
                size={18}
                color="var(--accent-secondary)"
              />{" "}
              Assignee
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {canAssign && (
                <CustomSelect
                  name="assigneeId"
                  control={control}
                  options={[
                    {
                      value: "",
                      label: "Unassigned",
                      icon: <CustomIcon name="UserPlus" size={14} />,
                    },
                    ...users.map((agent) => ({
                      value: agent.id,
                      label: agent.fullname,
                      image: agent.image,
                    })),
                  ]}
                  onChange={(val) => {
                    setValue("assigneeId", val, {
                      shouldDirty: true,
                    });
                    if (val) {
                      const openStatus = statuses.find(
                        (c: any) =>
                          c.name.toLowerCase() ===
                          StatusName.OPEN.toLowerCase(),
                      );
                      if (openStatus && watch("statusId") !== openStatus.id) {
                        setValue("statusId", openStatus.id, {
                          shouldDirty: true,
                        });
                        setValue("targetStatusName", openStatus.name, {
                          shouldDirty: true,
                        });
                      }
                    }
                  }}
                  disabled={!canAssign}
                  placeholder="Assign ticket..."
                />
              )}

              {!canAssign && (
                <div
                  className="glass-card"
                  style={{
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 64,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 12,
                  }}
                >
                  {displayTicket.assignee ? (
                    <>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "rgba(6, 182, 212, 0.1)",
                          color: "var(--accent-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        {displayTicket.assignee.fullname.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {displayTicket.assignee.fullname}
                          {displayTicket.assignee.id !== user?.id && (
                            <CustomButton
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStartChat(displayTicket.assignee.id)
                              }
                              icon={
                                <CustomIcon name="MessageSquare" size={14} />
                              }
                              title="Chat with Assignee"
                              style={{
                                padding: 0,
                                minHeight: "auto",
                                color: "var(--accent-secondary)",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        fontStyle: "italic",
                      }}
                    >
                      Unassigned
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* QA Assignment */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <label
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <CustomIcon
                name="UserPlus"
                size={18}
                color="var(--accent-secondary)"
              />{" "}
              QA Assignee
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {canAssignQA && (
                <CustomSelect
                  name="qaId"
                  control={control}
                  options={[
                    {
                      value: "",
                      label: "Unassigned",
                      icon: <CustomIcon name="UserPlus" size={14} />,
                    },
                    ...qaList.map((qaUser) => ({
                      value: qaUser.id,
                      label: qaUser.fullname,
                      image: qaUser.image,
                    })),
                  ]}
                  onChange={(val) => {
                    setValue("qaId", val, {
                      shouldDirty: true,
                    });
                  }}
                  disabled={!canAssignQA}
                  placeholder="Assign QA..."
                />
              )}

              {!canAssignQA && (
                <div
                  className="glass-card"
                  style={{
                    padding: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minHeight: 64,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-glass)",
                    borderRadius: 12,
                  }}
                >
                  {displayTicket.qa ? (
                    <>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "rgba(6, 182, 212, 0.1)",
                          color: "var(--accent-secondary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        {displayTicket.qa.fullname.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            color: "var(--text-primary)",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {displayTicket.qa.fullname}
                          {displayTicket.qa.id !== user?.id && (
                            <CustomButton
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleStartChat(displayTicket.qa.id)
                              }
                              icon={
                                <CustomIcon name="MessageSquare" size={14} />
                              }
                              title="Chat with QA"
                              style={{
                                padding: 0,
                                minHeight: "auto",
                                color: "var(--accent-secondary)",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        fontStyle: "italic",
                      }}
                    >
                      Unassigned
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModalDetailsForm;
