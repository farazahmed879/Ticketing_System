import React, { useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { useNotification } from "../../context/NotificationContext";
import { API_ROUTES } from "../../utils/apiRoutes";
import type { TableColumn } from "../../components/types";
import CustomTable from "../../components/CustomTable";
import CustomBadge from "../../components/CustomBadge";
import CustomButton from "../../components/CustomButton";
import { format } from "date-fns";
import AnnouncementModal from "./components/AnnouncementModal";
import ConfirmationModal from "../../components/ConfirmationModal";

interface Announcement {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  author: {
    fullname: string;
  };
}

const AnnouncementList: React.FC = () => {
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
  const { showNotification, setIsLoading } = useNotification();

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(API_ROUTES.ANNOUNCEMENTS.BASE);
      setAnnouncements(response.data.announcements);
    } catch (err) {
      console.error("Failed to fetch announcements", err);
      showNotification("error", "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      render: (ann) => (
        <CustomBadge variant={ann.type === "event" ? "info" : "warning"}>
          {ann.type.toUpperCase()}
        </CustomBadge>
      ),
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{ann.author.fullname}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
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
          />
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700 }}>Announcements</h1>
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
          Create Announcement
        </CustomButton>
      </div>

      <div className="glass-card" style={{ padding: 0 }}>
        <CustomTable
          columns={columns}
          data={announcements}
          loading={loading}
          emptyMessage="No announcements found"
        />
      </div>

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
    </div>
  );
};

export default AnnouncementList;
