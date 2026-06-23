import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomButton from "../../components/CustomButton";
import CustomTable from "../../components/CustomTable";
import CustomIcon from "../../components/CustomIcon";
import TimesheetReviewModal from "./components/TimesheetReviewModal";

import type { TimesheetEntry } from "../../types";

import { useNavigate } from "react-router-dom";
import { RoleName } from "../../utils/constants";
import CustomBadge from "../../components/CustomBadge";
import CustomSelect from "../../components/CustomSelect";
import StandardListLayout from "../../components/StandardListLayout/StandardListLayout";

import CustomInput from "../../components/CustomInput/CustomInput";
import CustomImage from "../../components/CustomImage";

const TimesheetReview: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("PENDING");
  const [month, setMonth] = useState<string>(new Date().getMonth().toString());
  const [year, setYear] = useState<string>(new Date().getFullYear().toString());
  const [userSearch, setUserSearch] = useState("");

  const { data: usersData } = useQuery({
    queryKey: ["users", "timesheet-review"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.USERS.GET_BY_ROLES, {
        params: {
          roles: [
            RoleName.AGENT,
            RoleName.EMPLOYEE,
            RoleName.HR,
            RoleName.ADMIN,
          ],
          limit: -1,
        },
      });
      return res.data.accounts;
    },
  });

  const users = usersData || [];

  const { data: entriesData, isLoading: loading } = useQuery({
    queryKey: [
      "timesheets",
      "pending",
      selectedStatus,
      selectedUserId,
      month,
      year,
    ],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TIMESHEETS.PENDING, {
        params: {
          status: selectedStatus,
          userId: selectedUserId || undefined,
          month: month === "all" ? undefined : month,
          year: year === "all" ? undefined : year,
        },
      });
      return res.data.entries;
    },
  });

  const entries: TimesheetEntry[] = entriesData || [];

  const fetchEntries = () => {
    queryClient.invalidateQueries({ queryKey: ["timesheets", "pending"] });
  };

  const filteredUsers = users.filter(
    (u: any) =>
      u.fullname.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()),
  );

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(API_ROUTES.TIMESHEETS.APPROVE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setIsModalOpen(false);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.post(API_ROUTES.TIMESHEETS.REJECT(id), {
        reason: rejectReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["timesheets"] });
      setIsModalOpen(false);
      setRejectReason("");
    },
  });

  const handleApprove = async (id: string) => {
    approveMutation.mutate(id);
  };

  const handleReject = async (id: string) => {
    rejectMutation.mutate(id);
  };

  const months = [
    { value: "all", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = [
    { value: "all", label: "All Years" },
    ...Array.from({ length: 5 }, (_, i) => {
      const y = new Date().getFullYear() - i;
      return { value: y.toString(), label: y.toString() };
    }),
  ];

  return (
    <StandardListLayout
      header={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 15 }}>
            <CustomButton
              variant="ghost"
              onClick={() => navigate("/timesheet")}
              icon={<CustomIcon name="ArrowLeft" size={20} />}
              style={{
                width: 40,
                height: 40,
                padding: 0,
                borderRadius: "12px",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border-glass)",
              }}
            />
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
                Timesheet Approvals
              </h1>
              <p
                style={{
                  color: "var(--text-muted)",
                  margin: "4px 0 0 0",
                  fontSize: "0.9rem",
                }}
              >
                Review and manage team timesheet entries
              </p>
            </div>
          </div>
        </div>
      }
      filters={
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8 }}>
              <CustomSelect
                value={month}
                onChange={setMonth}
                options={months}
                style={{ width: 150 }}
                placeholder="Month"
              />
              <CustomSelect
                value={year}
                onChange={setYear}
                options={years}
                style={{ width: 100 }}
                placeholder="Year"
              />
            </div>
            <div
              className="glass-card"
              style={{ display: "flex", padding: 4, borderRadius: 12 }}
            >
              <button
                onClick={() => setSelectedStatus("PENDING")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    selectedStatus === "PENDING"
                      ? "var(--accent-primary)"
                      : "transparent",
                  color:
                    selectedStatus === "PENDING"
                      ? "white"
                      : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                Pending
              </button>
              <button
                onClick={() => setSelectedStatus("APPROVED")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background:
                    selectedStatus === "APPROVED"
                      ? "var(--accent-primary)"
                      : "transparent",
                  color:
                    selectedStatus === "APPROVED"
                      ? "white"
                      : "var(--text-muted)",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s",
                }}
              >
                Approved
              </button>
            </div>
          </div>
          <CustomButton
            variant="secondary"
            onClick={fetchEntries}
            icon={<CustomIcon name="RotateCcw" size={18} />}
          >
            Refresh
          </CustomButton>
        </div>
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 320px",
          gap: 24,
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Main Content: Table */}
        <div
          className="glass-card"
          style={{
            padding: 24,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {selectedUserId && (
            <div
              className="animate-fade-in"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "16px 20px",
                background: "rgba(124, 58, 237, 0.05)",
                borderRadius: 16,
                border: "1px solid rgba(124, 58, 237, 0.1)",
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "2px solid var(--accent-primary)",
                  padding: 2,
                  background: "var(--bg-card)",
                }}
              >
                {users.find((u: any) => u.id === selectedUserId)?.image ? (
                  <CustomImage
                    src={users.find((u: any) => u.id === selectedUserId)?.image}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(255,255,255,0.05)",
                      borderRadius: "50%",
                    }}
                  >
                    <CustomIcon
                      name="User"
                      size={24}
                      color="var(--accent-primary)"
                    />
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h2
                    style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}
                  >
                    {users.find((u) => u.id === selectedUserId)?.fullname}
                  </h2>
                  <CustomBadge variant="primary">
                    {users.find((u) => u.id === selectedUserId)?.role?.name}
                  </CustomBadge>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 15,
                    marginTop: 4,
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                  }}
                >
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CustomIcon name="Mail" size={14} />
                    {users.find((u) => u.id === selectedUserId)?.email}
                  </span>
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <CustomIcon name="Calendar" size={14} />
                    {month === "all"
                      ? "All Time"
                      : months.find((m) => m.value === month)?.label}{" "}
                    {year}
                  </span>
                </div>
              </div>
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserId(null)}
                icon={<CustomIcon name="X" size={16} />}
                style={{
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  padding: 0,
                }}
              />
            </div>
          )}

          <div style={{ flex: 1, overflow: "auto", paddingRight: 4 }}>
            <CustomTable
              columns={[
                {
                  header: "User",
                  key: "user",
                  render: (e) => (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.05)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          border: "1px solid var(--border-glass)",
                        }}
                      >
                        {e.user?.image ? (
                          <CustomImage
                            src={e.user.image}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <CustomIcon
                            name="User"
                            size={18}
                            color="var(--text-muted)"
                          />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                          {e.user?.fullname}
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {e.user?.email}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  header: "Date",
                  key: "date",
                  render: (e) => (
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ fontWeight: 600 }}>
                        {format(new Date(e.date), "MMM dd, yyyy")}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {format(new Date(e.date), "EEEE")}
                      </span>
                    </div>
                  ),
                },
                {
                  header: "Hours",
                  key: "totalHours",
                  render: (e) => (
                    <div
                      style={{
                        display: "inline-flex",
                        padding: "4px 10px",
                        borderRadius: 8,
                        background: "rgba(124, 58, 237, 0.1)",
                        color: "var(--accent-primary)",
                        fontWeight: 700,
                      }}
                    >
                      {e.totalHours}h
                    </div>
                  ),
                },
                {
                  header: "Status",
                  key: "status",
                  render: (e) => (
                    <CustomBadge
                      variant={
                        e.status === "APPROVED"
                          ? "success"
                          : e.status === "REJECTED"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {e.status}
                    </CustomBadge>
                  ),
                },
                {
                  header: "Actions",
                  key: "actions",
                  render: (e) => (
                    <div style={{ display: "flex", gap: 8 }}>
                      <CustomButton
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEntry(e);
                          setIsModalOpen(true);
                        }}
                        icon={<CustomIcon name="Eye" size={16} />}
                        style={{ padding: "8px" }}
                      />
                      {e.status === "PENDING" && (
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApprove(e.id)}
                          icon={<CustomIcon name="CheckCircle2" size={16} />}
                          style={{
                            color: "var(--accent-success)",
                            padding: "8px",
                          }}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
              data={entries}
              loading={loading}
              emptyMessage={`No ${selectedStatus.toLowerCase()} timesheets found`}
            />
          </div>
        </div>

        {/* Sidebar: Users List */}
        <div
          className="glass-card"
          style={{
            padding: 24,
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
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
            <button
              onClick={() => setSelectedUserId(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px",
                borderRadius: 12,
                border: "1px solid",
                borderColor:
                  selectedUserId === null
                    ? "var(--accent-primary)"
                    : "transparent",
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
            </button>

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
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
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
                    <div
                      style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                    >
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
                </button>
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
        </div>
      </div>

      <TimesheetReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        entry={selectedEntry}
        rejectReason={rejectReason}
        onRejectReasonChange={setRejectReason}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </StandardListLayout>
  );
};

export default TimesheetReview;
