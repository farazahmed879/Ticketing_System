import React, { useCallback, useEffect, useState } from "react";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomBadge from "../../components/CustomBadge";
import CustomTable from "../../components/CustomTable";
import CustomPagination from "../../components/CustomPagination";
import type { TableColumn } from "../../components/types";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import styles from "./Settings.module.css";

interface DbBackup {
  id: string;
  fileName: string;
  status: "RUNNING" | "SUCCESS" | "FAILED";
  trigger: "SCHEDULED" | "MANUAL";
  triggeredByName?: string | null;
  sizeBytes?: number | null;
  documentCount?: number | null;
  error?: string | null;
  fileDeleted: boolean;
  startedAt: string;
  completedAt?: string | null;
}

const POLL_MS = 5000;

const formatBytes = (n?: number | null) => {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const formatDuration = (b: DbBackup) => {
  if (!b.completedAt) return "—";
  const s = Math.round(
    (new Date(b.completedAt).getTime() - new Date(b.startedAt).getTime()) / 1000,
  );
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const BackupSettingsSection: React.FC = () => {
  const [items, setItems] = useState<DbBackup[]>([]);
  const [total, setTotal] = useState(0);
  const [nextScheduledAt, setNextScheduledAt] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get(API_ROUTES.BACKUPS.BASE, {
        params: { page, limit: pageSize },
      });
      setItems(res.data.items);
      setTotal(res.data.total);
      setNextScheduledAt(res.data.nextScheduledAt);
    } catch {
      setMsg({ type: "error", text: "Failed to load backup history." });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh while a backup is in progress so its row updates on its own.
  const anyRunning = items.some((b) => b.status === "RUNNING");
  useEffect(() => {
    if (!anyRunning) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [anyRunning, load]);

  const handleBackupNow = async () => {
    setStarting(true);
    setMsg(null);
    try {
      await api.post(API_ROUTES.BACKUPS.BASE);
      setMsg({ type: "success", text: "Backup started. This list updates when it finishes." });
      setPage(0);
      await load();
    } catch (err: any) {
      setMsg({
        type: "error",
        text: err?.response?.data?.message || "Failed to start backup.",
      });
    } finally {
      setStarting(false);
    }
  };

  const handleDownload = async (b: DbBackup) => {
    setDownloadingId(b.id);
    try {
      const res = await api.get(API_ROUTES.BACKUPS.DOWNLOAD(b.id), {
        responseType: "blob",
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = b.fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ type: "error", text: "Failed to download backup." });
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: TableColumn<DbBackup>[] = [
    {
      header: "Started",
      key: "startedAt",
      render: (b) => formatDate(b.startedAt),
    },
    {
      header: "Status",
      key: "status",
      render: (b) => (
        <span title={b.error || undefined}>
          <CustomBadge
            variant={
              b.status === "SUCCESS" ? "success" : b.status === "FAILED" ? "danger" : "info"
            }
          >
            {b.status === "RUNNING" ? "In progress" : b.status === "SUCCESS" ? "Success" : "Failed"}
          </CustomBadge>
        </span>
      ),
    },
    {
      header: "Type",
      key: "trigger",
      render: (b) =>
        b.trigger === "MANUAL" ? `Manual${b.triggeredByName ? ` · ${b.triggeredByName}` : ""}` : "Scheduled",
    },
    { header: "Size", key: "sizeBytes", render: (b) => formatBytes(b.sizeBytes) },
    {
      header: "Records",
      key: "documentCount",
      render: (b) => (b.documentCount != null ? b.documentCount.toLocaleString() : "—"),
    },
    { header: "Duration", key: "completedAt", render: formatDuration },
    {
      header: "Actions",
      key: "actions",
      render: (b) =>
        b.status === "SUCCESS" && !b.fileDeleted ? (
          <CustomButton
            variant="ghost"
            size="sm"
            icon={<CustomIcon name="Download" size={16} />}
            loading={downloadingId === b.id}
            onClick={() => handleDownload(b)}
          >
            Download
          </CustomButton>
        ) : b.status === "FAILED" ? (
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {b.error || "Failed"}
          </span>
        ) : b.fileDeleted ? (
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Expired</span>
        ) : null,
    },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <CustomIcon name="DatabaseBackup" size={24} color="var(--accent-primary)" />
        <div>
          <h3>Database Backup</h3>
          <p>
            Automatic backup every Sunday at 2:00 AM (PKT), saved privately to Google Drive.
            {nextScheduledAt && <> Next: {formatDate(nextScheduledAt)}.</>}
          </p>
        </div>
      </div>

      <div className={styles.settingGroup}>
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="DatabaseBackup" size={18} />}
          loading={starting}
          disabled={starting || anyRunning}
          onClick={handleBackupNow}
        >
          {anyRunning ? "Backup in progress..." : "Backup Now"}
        </CustomButton>
        {msg && (
          <p
            className={styles.hint}
            style={{ color: msg.type === "error" ? "#f44336" : "#4caf50", marginTop: 8 }}
          >
            {msg.text}
          </p>
        )}
      </div>

      <div className={styles.settingGroup}>
        <label>Backup History</label>
        <CustomTable
          columns={columns}
          data={items}
          loading={loading}
          emptyMessage="No backups yet"
        />
        {total > pageSize && (
          <CustomPagination
            currentPage={page}
            totalPages={Math.ceil(total / pageSize)}
            onPageChange={setPage}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(0);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BackupSettingsSection;
