import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

import { API_ROUTES } from "../../utils/apiRoutes";
import { UIMessages, DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";

import type { Interview } from "../../types";
import CustomTable from "../../components/CustomTable";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomBadge from "../../components/CustomBadge";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";

import StandardListLayout from "../../components/StandardListLayout";
import { getInterviewColumns, statusBadgeVariant } from "./columns";
import { InterviewListHeader } from "./components/InterviewListHeader";
import { InterviewListFilter } from "./components/InterviewListFilter";
import { ROLE_TYPE } from "../roles/roleConstants";

const InterviewList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const canUpdateInterviews =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.HR ||
    user?.role?.permissions?.interviews?.update;

  const canDeleteInterviews =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.interviews?.delete;

  const canCreateInterviews =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.HR ||
    user?.role?.permissions?.interviews?.create;

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [draftActiveFilter, setDraftActiveFilter] = useState("all");
  const [draftStartDate, setDraftStartDate] = useState("");
  const [draftEndDate, setDraftEndDate] = useState("");

  const activeMoreFilters =
    (startDate && endDate ? 1 : 0) + (activeFilter !== "all" ? 1 : 0);
  const draftSelectedCount =
    (draftStartDate && draftEndDate ? 1 : 0) +
    (draftActiveFilter !== "all" ? 1 : 0);

  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );

  React.useEffect(() => {
    setCurrentPage(0);
  }, [search]);

  const filters = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "today", label: "Today" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const { data: interviewsData, isLoading: loading } = useQuery({
    queryKey: [
      "interviews",
      search,
      activeFilter,
      startDate,
      endDate,
      currentPage,
      itemsPerPage,
    ],
    queryFn: async () => {
      const params: any = {
        search,
        filter: activeFilter,
        limit: itemsPerPage,
        page: currentPage,
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await api.get(API_ROUTES.INTERVIEWS.BASE, { params });
      return {
        interviews: res.data.interviews,
        total: res.data.total || 0,
      };
    },
  });

  const interviews = interviewsData?.interviews || [];
  const totalItems = interviewsData?.total || 0;

  const toggleMoreFilters = () => {
    if (showMoreFilters) {
      setShowMoreFilters(false);
    } else {
      setDraftActiveFilter(activeFilter);
      setDraftStartDate(startDate);
      setDraftEndDate(endDate);
      setShowMoreFilters(true);
    }
  };

  const applyMoreFilters = () => {
    setActiveFilter(draftActiveFilter);
    setStartDate(draftStartDate);
    setEndDate(draftEndDate);
    setCurrentPage(0);
    setShowMoreFilters(false);
  };

  const clearMoreFilters = () => {
    setDraftActiveFilter("all");
    setDraftStartDate("");
    setDraftEndDate("");
    setActiveFilter("all");
    setStartDate("");
    setEndDate("");
    setCurrentPage(0);
    setShowMoreFilters(false);
  };

  const handleScheduleSuccess = () => {
    setIsModalOpen(false);
    setEditingInterview(null);
    queryClient.invalidateQueries({ queryKey: ["interviews"] });
  };

  const handleDeleteClick = (id: string) => {
    setInterviewToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.INTERVIEWS.BY_ID(id));
    },
    onMutate: () => setIsLoading(true, UIMessages.LOADING.DELETING),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      showNotification("success", "Interview deleted successfully");
      setIsDeleteModalOpen(false);
      setInterviewToDelete(null);
    },
    onError: (err: any) => {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete interview",
      );
      setInterviewToDelete(null);
    },
  });

  const confirmDelete = async () => {
    if (!interviewToDelete) return;
    deleteMutation.mutate(interviewToDelete);
  };

  const columns = getInterviewColumns(
    canUpdateInterviews,
    canDeleteInterviews,
    setEditingInterview,
    setIsModalOpen,
    handleDeleteClick,
  );

  return (
    <>
      <StandardListLayout
        header={
          <InterviewListHeader
            canCreateInterviews={canCreateInterviews}
            onScheduleClick={() => {
              setEditingInterview(null);
              setIsModalOpen(true);
            }}
          />
        }
        filters={
          <InterviewListFilter
            search={search}
            setSearch={setSearch}
            showMoreFilters={showMoreFilters}
            activeMoreFilters={activeMoreFilters}
            draftSelectedCount={draftSelectedCount}
            toggleMoreFilters={toggleMoreFilters}
            filters={filters}
            draftActiveFilter={draftActiveFilter}
            setDraftActiveFilter={setDraftActiveFilter}
            draftStartDate={draftStartDate}
            setDraftStartDate={setDraftStartDate}
            draftEndDate={draftEndDate}
            setDraftEndDate={setDraftEndDate}
            clearMoreFilters={clearMoreFilters}
            applyMoreFilters={applyMoreFilters}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        }
        pagination={
          <CustomPagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / itemsPerPage)}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageSizeChange={(size) => {
              setItemsPerPage(size);
              setCurrentPage(0);
            }}
          />
        }
      >
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={interviews}
            loading={loading}
            loadingMessage="Loading interviews..."
            emptyMessage="No interviews found"
            onRowClick={(i) => navigate(`/interviews/${i.id}`)}
          />
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            Loading interviews...
          </div>
        ) : interviews.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            No interviews found
          </div>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 16,
              padding: "4px 0",
              alignContent: "start",
            }}
          >
            {interviews.map((i: Interview) => {
              const dateVal = new Date(i.scheduledAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const timeVal = new Date(i.scheduledAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <div
                  key={i.id}
                  onClick={() => navigate(`/interviews/${i.id}`)}
                  className="glass-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                    cursor: "pointer",
                    transition: "var(--transition-normal)",
                    position: "relative",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "var(--bg-glass)",
                          color: "var(--text-primary)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1.1rem",
                        }}
                      >
                        {i.candidate.name.charAt(0)}
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
                          {i.candidate.name}
                        </h3>
                        <span className="text-xs-muted" style={{ display: "block", marginTop: 2 }}>
                          {i.candidate.position}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <CustomBadge variant={statusBadgeVariant(i.status)}>
                        {i.status}
                      </CustomBadge>
                      <div
                        style={{ display: "flex", gap: 2, marginLeft: 6 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {canUpdateInterviews && (
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingInterview(i);
                              setIsModalOpen(true);
                            }}
                            icon={<CustomIcon name="Edit2" size={14} />}
                            style={{ padding: 6, minHeight: "auto" }}
                          />
                        )}
                        {canDeleteInterviews && (
                          <CustomButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(i.id)}
                            icon={<CustomIcon name="Trash2" size={14} />}
                            style={{ padding: 6, minHeight: "auto", color: "var(--accent-danger)" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs-muted" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                      Interview Details
                    </span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)" }}>{i.title}</span>
                  </div>

                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <CustomIcon name="Calendar" size={16} color="var(--text-muted)" />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {dateVal} at {timeVal} ({i.duration} min)
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-glass)", paddingTop: 12 }}>
                    <div>
                      <span className="text-xs-muted" style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>
                        Feedback
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                        {i._count?.feedbacks || 0} / {i.panelMembers.length} Complete
                      </span>
                    </div>

                    <div>
                      <span className="text-xs-muted" style={{ display: "block", marginBottom: 4, fontWeight: 600, textAlign: "right" }}>
                        Panel
                      </span>
                      <CustomAvatarStack
                        items={i.panelMembers.map((pm) => ({
                          id: pm.id,
                          name: pm.user.fullname,
                          image: pm.user.image,
                        }))}
                        limit={3}
                        size={24}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </StandardListLayout>

      <ScheduleInterviewModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInterview(null);
        }}
        onSuccess={handleScheduleSuccess}
        interview={editingInterview}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Interview"
        message="Are you sure you want to delete this interview?"
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default InterviewList;
