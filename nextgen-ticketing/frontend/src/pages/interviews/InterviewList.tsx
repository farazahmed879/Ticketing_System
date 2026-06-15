import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import styles from "./InterviewList.module.css";
import { API_ROUTES } from "../../utils/apiRoutes";
import { RoleName, UIMessages, DEFAULT_PAGE_SIZE } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";

import type { Interview } from "../../types";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomFilterBar from "../../components/CustomFilterBar";
import CustomDatePicker from "../../components/CustomDatePicker";
import ScheduleInterviewModal from "./ScheduleInterviewModal";
import CustomPagination from "../../components/CustomPagination";
import ConfirmationModal from "../../components/ConfirmationModal";

import StandardListLayout from "../../components/StandardListLayout";
import { getInterviewColumns } from "./columns";

const InterviewList: React.FC = () => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [activeFilter, setActiveFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingInterview, setEditingInterview] = useState<Interview | null>(
    null,
  );

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(
    null,
  );

  const [currentPage, setCurrentPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  const filters = [
    { value: "all", label: "All" },
    { value: "upcoming", label: "Upcoming" },
    { value: "today", label: "Today" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const params: any = {
        filter: activeFilter,
        limit: itemsPerPage,
        page: currentPage,
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
        delete params.filter;
      }

      const res = await api.get(API_ROUTES.INTERVIEWS.BASE, { params });
      setInterviews(res.data.interviews);
      setTotalItems(res.data.total);
    } catch (err) {
      console.error("Failed to fetch interviews", err);
      showNotification("error", "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchInterviews();
  }, [activeFilter, currentPage, itemsPerPage]);

  const handleDateFilter = () => {
    if (startDate && endDate) {
      setCurrentPage(0);
      fetchInterviews();
    }
  };

  const handleScheduleSuccess = () => {
    setIsModalOpen(false);
    setEditingInterview(null);
    fetchInterviews();
  };

  const handleDeleteClick = (id: string) => {
    setInterviewToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!interviewToDelete) return;
    setIsLoading(true, UIMessages.LOADING.DELETING);
    try {
      await api.delete(API_ROUTES.INTERVIEWS.BY_ID(interviewToDelete));
      showNotification("success", "Interview deleted successfully");
      fetchInterviews();
    } catch (err: any) {
      showNotification(
        "error",
        err.response?.data?.error || "Failed to delete interview",
      );
    } finally {
      setIsLoading(false, "");
      setIsDeleteModalOpen(false);
      setInterviewToDelete(null);
    }
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
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>
                Interviews
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Schedule and manage candidate interviews
              </p>
            </div>
            {canCreateInterviews && (
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={() => {
                  setEditingInterview(null);
                  setIsModalOpen(true);
                }}
              >
                Schedule Interview
              </CustomButton>
            )}
          </div>
        }
        filters={
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <CustomFilterBar
              options={filters}
              activeOption={activeFilter}
              onChange={(val) => {
                setActiveFilter(val);
                setCurrentPage(0);
                setStartDate("");
                setEndDate("");
              }}
            />

            <div className={styles.dateFilter}>
              <CustomDatePicker
                value={startDate}
                onChange={(val: string) => setStartDate(val)}
                placeholder="Start Date"
                className={styles.dateInput}
              />
              <span style={{ color: "var(--text-muted)", marginTop: 4 }}>
                to
              </span>
              <CustomDatePicker
                value={endDate}
                onChange={(val: string) => setEndDate(val)}
                placeholder="End Date"
                className={styles.dateInput}
              />
              <CustomButton
                variant="outline"
                size="sm"
                onClick={handleDateFilter}
                disabled={!startDate || !endDate}
                containerStyle={{ marginTop: 4 }}
              >
                Apply
              </CustomButton>
            </div>
          </div>
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
