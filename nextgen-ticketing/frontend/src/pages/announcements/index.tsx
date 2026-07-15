import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useAuth } from "../../context/AuthContext";
import CustomTable from "../../components/CustomTable";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import AnnouncementModal from "./components/AnnouncementModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomPagination from "../../components/CustomPagination";
import CustomBadge from "../../components/CustomBadge";
import { format } from "date-fns";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, AnnouncementType } from "../../utils/constants";

import StandardListLayout from "../../components/StandardListLayout";
import { getAnnouncementColumns, type Announcement } from "./columns";
import { ROLE_TYPE } from "../roles/roleConstants";

const AnnouncementList: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
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
  const [searchInput, setSearchInput] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">(
    (localStorage.getItem("defaultListView") as "list" | "grid") || "list",
  );
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
        return api.put(
          API_ROUTES.ANNOUNCEMENTS.BY_ID(editingAnnouncement.id),
          data,
        );
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
        editingAnnouncement
          ? "Announcement updated successfully"
          : "Announcement created successfully",
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
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
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
          <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
            <CustomInput
              placeholder={`Search ${entityNamePlural.toLowerCase()}...`}
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setSearchInput(val);
                if (val === "") {
                  setSearch("");
                  setPage(0);
                }
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") {
                  setSearch(searchInput);
                  setPage(0);
                }
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ width: "350px" }}
            />
            <div
              style={{
                display: "flex",
                gap: 4,
                padding: 4,
                borderRadius: 10,
                border: "1px solid var(--border-glass)",
                background: "rgba(255,255,255,0.03)",
                marginLeft: "auto",
              }}
            >
              <CustomButton
                variant={viewMode === "list" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                icon={<CustomIcon name="List" size={16} />}
                title="List view"
                style={{ padding: "6px 10px" }}
              />
              <CustomButton
                variant={viewMode === "grid" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                icon={<CustomIcon name="LayoutGrid" size={16} />}
                title="Grid view"
                style={{ padding: "6px 10px" }}
              />
            </div>
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
        {viewMode === "list" ? (
          <CustomTable
            style={{ flex: 1, overflowY: "auto" }}
            columns={columns}
            data={announcements}
            loading={loading}
            emptyMessage="No announcements found"
          />
        ) : loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            Loading {entityNamePlural.toLowerCase()}...
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", flex: 1 }}>
            No {entityNamePlural.toLowerCase()} found
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
            {announcements.map((ann: Announcement) => {
              let variant: "info" | "warning" | "success" | "danger" | "neutral" | "primary" = "neutral";
              let iconName: "Megaphone" | "Calendar" | "AlertTriangle" | "Star" | "Info" | "Award" = "Megaphone";

              if (ann.type === AnnouncementType.EVENT) {
                variant = "info";
                iconName = "Calendar";
              } else if (ann.type === AnnouncementType.IMPORTANT) {
                variant = "danger";
                iconName = "AlertTriangle";
              } else if (ann.type === AnnouncementType.REVIEW) {
                variant = "success";
                iconName = "Star";
              } else if (ann.type === AnnouncementType.INFO) {
                variant = "warning";
                iconName = "Info";
              } else if (ann.type === AnnouncementType.MOMENT) {
                variant = "primary";
                iconName = "Award";
              }

              return (
                <div
                  key={ann.id}
                  className="glass-card"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                    transition: "var(--transition-normal)",
                    position: "relative",
                    border: "1px solid var(--border-glass)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        className="icon-box"
                        style={{
                          padding: 8,
                          borderRadius: 8,
                          background: `rgba(${variant === "info" ? "33,150,243" : variant === "danger" ? "244,67,54" : variant === "success" ? "76,175,80" : variant === "warning" ? "255,152,0" : "124,58,237"},0.1)`,
                          color: `var(--accent-${variant === "info" ? "secondary" : variant === "danger" ? "danger" : variant === "success" ? "success" : variant === "warning" ? "warning" : "primary"})`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <CustomIcon name={iconName} size={20} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0 }}>
                          {ann.title}
                        </h3>
                        <span className="text-xs-muted" style={{ display: "block", marginTop: 2 }}>
                          {format(new Date(ann.date), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      <CustomBadge variant={variant}>
                        {ann.type.toUpperCase()}
                      </CustomBadge>
                      <div style={{ display: "flex", gap: 2, marginLeft: 6 }}>
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(ann)}
                          icon={<CustomIcon name="Edit2" size={14} />}
                          style={{ padding: 6, minHeight: "auto" }}
                        />
                        <CustomButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(ann.id)}
                          icon={<CustomIcon name="Trash2" size={14} />}
                          style={{ padding: 6, minHeight: "auto", color: "var(--accent-danger)" }}
                        />
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    {ann.description}
                  </p>

                  {ann.project && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <CustomIcon name="FolderKanban" size={14} color="var(--text-muted)" />
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Project: {ann.project.name}
                      </span>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-glass)", paddingTop: 12 }}>
                    <div>
                      <span className="text-xs-muted" style={{ display: "block", marginBottom: 2, fontWeight: 600 }}>
                        Author
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 600 }}>
                        {ann.author.fullname}
                      </span>
                    </div>
                    <span className="text-xs-muted">
                      {(ann.author as any).title || (ann.author as any).role?.name || "Member"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
