import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";

import { API_ROUTES } from "../../utils/apiRoutes";
import { RoleName, UIMessages, DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";

import type { Interview } from "../../types";
import CustomTable from "../../components/CustomTable";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getInterviewColumns } from "./columns";
import { InterviewListHeader } from "./components/InterviewListHeader";
import { InterviewListFilter } from "./components/InterviewListFilter";

const InterviewList: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showNotification, setIsLoading } = useNotification();
  const { user } = useAuth();

  const canUpdateInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
    user?.role?.permissions?.interviews?.update;

  const canDeleteInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.permissions?.interviews?.delete;

  const canCreateInterviews =
    user?.role?.name === RoleName.ADMIN ||
    user?.role?.name === RoleName.HR ||
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
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={interviews}
          loading={loading}
          loadingMessage="Loading interviews..."
          emptyMessage="No interviews found"
          onRowClick={(i) => navigate(`/interviews/${i.id}`)}
        />
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
