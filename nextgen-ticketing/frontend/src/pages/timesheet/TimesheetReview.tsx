import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import CustomImage from "../../components/CustomImage";
import StandardListLayout from "../../components/StandardListLayout/StandardListLayout";

import { TimesheetReviewHeader } from "./components/TimesheetReviewHeader";
import { TimesheetReviewFilter } from "./components/TimesheetReviewFilter";
import { TimesheetReviewSidebar } from "./components/TimesheetReviewSidebar";
import { useTimesheetReviewColumns } from "./components/TimesheetReviewColumns";

const TimesheetReview: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(
    null,
  );
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

  const columns = useTimesheetReviewColumns({
    setSelectedEntry,
    setIsModalOpen,
    handleApprove,
  });

  return (
    <StandardListLayout
      header={<TimesheetReviewHeader onBack={() => navigate("/timesheet")} />}
      filters={
        <TimesheetReviewFilter
          month={month}
          setMonth={setMonth}
          months={months}
          year={year}
          setYear={setYear}
          years={years}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          onRefresh={fetchEntries}
        />
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
                    {users.find((u: any) => u.id === selectedUserId)?.fullname}
                  </h2>
                  <CustomBadge variant="primary">
                    {
                      users.find((u: any) => u.id === selectedUserId)?.role
                        ?.name
                    }
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
                    {users.find((u: any) => u.id === selectedUserId)?.email}
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
              columns={columns}
              data={entries}
              loading={loading}
              emptyMessage={`No ${selectedStatus.toLowerCase()} timesheets found`}
            />
          </div>
        </div>

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
          <TimesheetReviewSidebar
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            filteredUsers={filteredUsers}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
          />
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
