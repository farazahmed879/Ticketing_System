import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import { AnnouncementType, RoleName } from "../../utils/constants";
import { useAuth } from "../../context/AuthContext";
import type { TableColumn } from "../../components/types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import { format } from "date-fns";
import AnnouncementModal from "./components/AnnouncementModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import CustomPagination from "../../components/CustomPagination";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "../../utils/constants";

interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  author: {
    fullname: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

import StandardListLayout from "../../components/StandardListLayout";

const AnnouncementList: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role?.name === RoleName.CUSTOMER;
  const entityName = isCustomer ? "Review" : "Shoutout";
  const entityNamePlural = isCustomer ? "Reviews" : "Shoutouts";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");
  const { showNotification, setIsLoading } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ROUTES.ANNOUNCEMENTS.BASE, {
        params: {
          page: page + 1,
          limit: limit,
          search,
        },
      });
      setAnnouncements(response.data.announcements);
      setTotalItems(response.data.pagination.total);
      setTotalPages(response.data.pagination.totalPages);
    } catch (err) {
      console.error("Failed to fetch announcements", err);
      showNotification("error", "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit, search]);

  const handleSubmit = async (data: any) => {
    setIsSaving(true);
    setIsLoading(true, "Saving announcement...");
    try {
      if (editingAnnouncement) {
        await api.put(
          API_ROUTES.ANNOUNCEMENTS.BY_ID(editingAnnouncement.id),
          data,
        );
        showNotification("success", "Announcement updated successfully");
      } else {
        await api.post(API_ROUTES.ANNOUNCEMENTS.BASE, data);
        showNotification("success", "Announcement created successfully");
      }
      setIsModalOpen(false);
      setEditingAnnouncement(null);
      fetchData();
    } catch (err: any) {
      showNotification("error", "Operation failed");
    } finally {
      setIsSaving(false);
      setIsLoading(false, "");
    }
  };

  const handleEdit = (ann: Announcement) => {
    setEditingAnnouncement(ann);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setAnnouncementToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    try {
      await api.delete(API_ROUTES.ANNOUNCEMENTS.BY_ID(announcementToDelete));
      showNotification("success", "Announcement deleted successfully");
      setIsDeleteModalOpen(false);
      fetchData();
    } catch (err: any) {
      showNotification("error", "Failed to delete announcement");
    } finally {
      setAnnouncementToDelete(null);
    }
  };

  const columns: TableColumn<Announcement>[] = [
    {
      header: "Title",
      key: "title",
      render: (ann) => <div style={{ fontWeight: 600 }}>{ann.title}</div>,
    },
    {
      header: "Type",
      key: "type",
      render: (ann) => {
        let variant:
          | "info"
          | "warning"
          | "success"
          | "danger"
          | "neutral"
          | "primary" = "neutral";
        if (ann.type === AnnouncementType.EVENT) variant = "info";
        else if (ann.type === AnnouncementType.IMPORTANT) variant = "danger";
        else if (ann.type === AnnouncementType.REVIEW) variant = "success";
        else if (ann.type === AnnouncementType.INFO) variant = "warning";
        else if (ann.type === AnnouncementType.MOMENT) variant = "primary";

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <CustomBadge variant={variant}>{ann.type.toUpperCase()}</CustomBadge>
            {ann.project && (
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                Project: {ann.project.name}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Scheduled Date",
      key: "date",
      render: (ann) => format(new Date(ann.date), "MMM dd, yyyy"),
    },
    {
      header: "Author",
      key: "author",
      render: (ann) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
            {ann.author.fullname}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {(ann.author as any).title || (ann.author as any).role?.name}
          </span>
        </div>
      ),
    },
    {
      header: "Actions",
      key: "actions",
      render: (ann) => (
        <div style={{ display: "flex", gap: 8 }}>
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(ann)}
            icon={<CustomIcon name="Edit2" size={16} />}
            title={`Edit ${entityName}`}
          />
          <CustomButton
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(ann.id)}
            icon={
              <CustomIcon
                name="Trash2"
                size={16}
                color="var(--accent-danger)"
              />
            }
            title={`Delete ${entityName}`}
          />
        </div>
      ),
    },
  ];

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
              <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>{entityNamePlural}</h1>
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
