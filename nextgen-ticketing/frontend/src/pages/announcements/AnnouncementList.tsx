import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import { RoleName } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import AnnouncementModal from "./components/AnnouncementModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomPagination from "../../components/CustomPagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../utils/constants";

import StandardListLayout from "../../components/StandardListLayout";
import { getAnnouncementColumns, type Announcement } from "./columns";

const AnnouncementList: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role?.name === RoleName.CUSTOMER;
  const entityName = isCustomer ? "Review" : "Shoutout";
  const entityNamePlural = isCustomer ? "Reviews" : "Shoutouts";

  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const { showNotification, setIsLoading } = useNotification();

  const { data: announcementsData, isLoading: loading } = useQuery({
    queryKey: ["announcements", page, limit, search],
    queryFn: async () => {
      const response = await api.get(API_ROUTES.ANNOUNCEMENTS.BASE, {
        params: {
          page: page + 1,
          limit: limit,
          search,
        },
      });
      return {
        announcements: response.data.announcements,
        total: response.data.pagination.total || 0,
        totalPages: response.data.pagination.totalPages || 0,
      };
    },
  });

  const announcements = announcementsData?.announcements || [];
  const totalItems = announcementsData?.total || 0;
  const totalPages = announcementsData?.totalPages || 0;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingAnnouncement) {
        return api.put(API_ROUTES.ANNOUNCEMENTS.BY_ID(editingAnnouncement.id), data);
      } else {
        return api.post(API_ROUTES.ANNOUNCEMENTS.BASE, data);
      }
    },
    onMutate: () => {
      setIsSaving(true);
      setIsLoading(true, "Saving announcement...");
    },
    onSettled: () => {
      setIsSaving(false);
      setIsLoading(false, "");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      showNotification(
        "success",
        editingAnnouncement ? "Announcement updated successfully" : "Announcement created successfully"
      );
      setIsModalOpen(false);
      setEditingAnnouncement(null);
    },
    onError: () => {
      showNotification("error", "Operation failed");
    },
  });

  const handleSubmit = async (data: any) => {
    saveMutation.mutate(data);
  };

  const handleEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAnnouncementToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(API_ROUTES.ANNOUNCEMENTS.BY_ID(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      showNotification("success", "Announcement deleted successfully");
      setIsDeleteModalOpen(false);
      setAnnouncementToDelete(null);
    },
    onError: () => {
      showNotification("error", "Failed to delete announcement");
      setAnnouncementToDelete(null);
    },
  });

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    deleteMutation.mutate(announcementToDelete);
  };

  const columns = getAnnouncementColumns(entityName, handleEdit, handleDelete);

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
                {entityNamePlural}
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                Manage company-wide announcements and events
              </p>
            </div>
            <CustomButton
              variant="gradient"
              icon={<CustomIcon name="Plus" size={20} />}
              onClick={() => {
                setEditingAnnouncement(null);
                setIsModalOpen(true);
              }}
            >
              Create {entityName}
            </CustomButton>
          </div>
        }
        filters={
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <CustomInput
              placeholder={`Search ${entityNamePlural.toLowerCase()}...`}
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ minWidth: "300px" }}
            />
          </div>
        }
        pagination={
          <CustomPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={limit}
            onPageChange={setPage}
            onPageSizeChange={(newLimit) => {
              setLimit(newLimit);
              setPage(0);
            }}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
          />
        }
      >
        <CustomTable
          style={{ flex: 1, overflowY: "auto" }}
          columns={columns}
          data={announcements}
          loading={loading}
          emptyMessage="No announcements found"
        />
      </StandardListLayout>

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        announcement={editingAnnouncement}
        onSubmit={handleSubmit}
        isLoading={isSaving}
      />

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement?"
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default AnnouncementList;
