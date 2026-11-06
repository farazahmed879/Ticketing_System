import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import CustomButton from "../../components/CustomButton";
import CustomTable from "../../components/CustomTable";
import CustomIcon from "../../components/CustomIcon";
import TimesheetReviewModal from "./components/TimesheetReviewModal";

import type { TimesheetEntry } from "../../types";

import { useNavigate } from "react-router-dom";
import { ROLE_TYPE } from "../roles/roleConstants";
import { useAuth } from "../../context/AuthContext";
import CustomBadge from "../../components/CustomBadge";
import CustomImage from "../../components/CustomImage";
import StandardListLayout from "../../components/StandardListLayout/StandardListLayout";

import { TimesheetReviewHeader } from "./components/TimesheetReviewHeader";
import { TimesheetReviewFilter } from "./components/TimesheetReviewFilter";
import { TimesheetReviewSidebar } from "./components/TimesheetReviewSidebar";
import { useTimesheetReviewColumns } from "./components/TimesheetReviewColumns";
import { TimesheetReviewCard } from "./components/TimesheetReviewCard";
import { canApproveTimesheetEntry } from "./components/TimesheetReviewCells";
import { getDefaultListView } from "../../utils/helpers";
import { format, startOfWeek, endOfWeek } from "date-fns";
import type { ReviewPeriod } from "./types";
import styles from "./Timesheet.module.css";

export default function TimesheetReview() {
  const { user } = useAuth();
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
  const [period, setPeriod] = useState<ReviewPeriod>("month");

  // Query params for the selected period: an exact day range for Today /
  // This Week (weeks start Monday), otherwise the month/year dropdowns.
  const periodParams = (() => {
    const now = new Date();
    if (period === "today") {
      const d = format(now, "yyyy-MM-dd");
      return { from: d, to: d };
    }
    if (period === "week") {
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd"),
      };
    }
    return {
      month: month === "all" ? undefined : month,
      year: year === "all" ? undefined : year,
    };
  })();
  const periodKey = JSON.stringify(periodParams);
  const [userSearch, setUserSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(getDefaultListView());

  const { data: usersData } = useQuery({
    queryKey: ["users", "timesheet-review"],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.USERS.GET_BY_ROLES, {
        params: {
          roles: [
            ROLE_TYPE.AGENT,
            ROLE_TYPE.EMPLOYEE,
            ROLE_TYPE.HR,
            ROLE_TYPE.ADMIN,
            ROLE_TYPE.QA,
          ],
          limit: -1,
        },
      });
      return res.data.accounts;
    },
  });

  const users = usersData || [];

  const {
    data: entriesData,
    isLoading: loading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "timesheets",
      "pending",
      selectedStatus,
      selectedUserId,
      periodKey,
    ],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TIMESHEETS.PENDING, {
        params: {
          // "ALL" tab → no status filter, the backend returns every entry.
          status: selectedStatus === "ALL" ? undefined : selectedStatus,
          userId: selectedUserId || undefined,
          ...periodParams,
        },
      });
      return res.data.entries;
    },
  });

  const { data: pendingCountsData } = useQuery({
    queryKey: ["timesheets", "pendingCounts", periodKey],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TIMESHEETS.PENDING_COUNTS, {
        params: periodParams,
      });
      // Convert [{ userId: "123", _count: { id: 2 } }] into { "123": 2 }
      const countsMap: Record<string, number> = {};
      if (res.data.counts) {
        res.data.counts.forEach((c: any) => {
          countsMap[c.userId] = c._count.id;
        });
      }
      return countsMap;
    },
  });

  const { data: unfilledData, refetch: refetchUnfilled } = useQuery({
    queryKey: ["timesheets", "unfilled-users", periodKey],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.TIMESHEETS.UNFILLED_USERS, {
        params: periodParams,
      });
      return res.data;
    },
  });

  const entries: TimesheetEntry[] = entriesData || [];

  // Refetch the current view directly (invalidation alone gives no visible
  // feedback and depends on key-prefix matching).
  const fetchEntries = () => {
    refetch();
    refetchUnfilled();
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

  // Values are 0-indexed to match the backend (`new Date(year, month)`) and
  // the default state (`new Date().getMonth()`).
  const months = [
    { value: "all", label: "All Months" },
    { value: "0", label: "January" },
    { value: "1", label: "February" },
    { value: "2", label: "March" },
    { value: "3", label: "April" },
    { value: "4", label: "May" },
    { value: "5", label: "June" },
    { value: "6", label: "July" },
    { value: "7", label: "August" },
    { value: "8", label: "September" },
    { value: "9", label: "October" },
    { value: "10", label: "November" },
    { value: "11", label: "December" },
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
    userRoleType: user?.role?.roleType,
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
          period={period}
          setPeriod={setPeriod}
          selectedStatus={selectedStatus}
          setSelectedStatus={setSelectedStatus}
          onRefresh={fetchEntries}
          refreshing={isFetching}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      }
    >
      <div className={styles.reviewGrid}>
        {/* Main Content: Table */}
        <div className={`glass-card ${styles.reviewMainCard}`}>
          {selectedUserId && (
            <div className={`animate-fade-in ${styles.reviewUserBanner}`}>
              <div
                style={{
                  flexShrink: 0,
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
              <div className={styles.reviewUserBannerInfo}>
                <div className={styles.reviewUserBannerTitle}>
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
                  {selectedUserId && unfilledData?.unfilledUserIds?.includes(selectedUserId) && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                        padding: "3px 10px",
                        borderRadius: 12,
                        fontSize: "0.75rem",
                        color: "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: "#ef4444",
                          boxShadow: "0 0 6px #ef4444",
                        }}
                      />
                      Timesheet Not Filled (
                      {unfilledData.userMissingDays?.[selectedUserId]?.count || 1} day
                      {(unfilledData.userMissingDays?.[selectedUserId]?.count || 1) > 1 ? "s" : ""} missing since Nov 1, 2026)
                    </div>
                  )}
                </div>
                <div className={styles.reviewUserBannerMeta}>
                  <span>
                    <CustomIcon name="Mail" size={14} />
                    {users.find((u: any) => u.id === selectedUserId)?.email}
                  </span>
                  <span>
                    <CustomIcon name="Calendar" size={14} />
                    {period === "today"
                      ? "Today"
                      : period === "week"
                        ? "This Week"
                        : `${month === "all" ? "All Months" : months.find((m) => m.value === month)?.label} ${year === "all" ? "All Years" : year}`}
                  </span>
                </div>
              </div>
              <CustomButton
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUserId(null)}
                icon={<CustomIcon name="X" size={16} />}
                className={styles.reviewUserBannerClose}
                style={{
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  padding: 0,
                }}
              />
            </div>
          )}

          <div className={styles.reviewScroll}>
            {viewMode === "list" ? (
              <CustomTable
                columns={columns}
                data={entries}
                loading={loading}
                emptyMessage={
                  selectedStatus === "ALL"
                    ? "No timesheets found"
                    : `No ${selectedStatus.toLowerCase()} timesheets found`
                }
              />
            ) : loading ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                Loading timesheets...
              </div>
            ) : entries.length === 0 ? (
              <div
                style={{
                  padding: 40,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                {selectedStatus === "ALL"
                  ? "No timesheets found"
                  : `No ${selectedStatus.toLowerCase()} timesheets found`}
              </div>
            ) : (
              <div className={styles.reviewCardsGrid}>
                {entries.map((entry) => (
                  <TimesheetReviewCard
                    key={entry.id}
                    entry={entry}
                    canApprove={canApproveTimesheetEntry(
                      entry,
                      user?.role?.roleType,
                    )}
                    onView={(e) => {
                      setSelectedEntry(e);
                      setIsModalOpen(true);
                    }}
                    onApprove={handleApprove}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={`glass-card ${styles.reviewSidebarCard}`}>
          <TimesheetReviewSidebar
            userSearch={userSearch}
            setUserSearch={setUserSearch}
            filteredUsers={filteredUsers}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            pendingCounts={pendingCountsData}
            unfilledData={unfilledData}
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
        userRoleType={user?.role?.roleType}
      />
    </StandardListLayout>
  );
}
