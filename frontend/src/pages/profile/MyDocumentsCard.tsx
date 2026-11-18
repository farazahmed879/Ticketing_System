import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import CustomIcon from "../../components/CustomIcon";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { DOCUMENT_TYPE_MAP, docTypeLabel, type DocumentType } from "../documents/documentConfig";
import DocumentViewerModal from "../documents/DocumentViewerModal";
import styles from "../documents/Documents.module.css";
import profileStyles from "./Profile.module.css";

interface Row {
  id: string;
  type: DocumentType;
  title: string;
  createdAt: string;
}

/**
 * Documents issued to a user (pay slips, letters). Employees see their own
 * on their profile; admins (Admin / Sub Admin) also see them on anyone's
 * profile. `?documentId=` (used by notifications) opens one directly.
 */
const MyDocumentsCard: React.FC<{ userId: string; isSelf: boolean }> = ({ userId, isSelf }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get("documentId");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["hr-documents-of", userId, isSelf],
    queryFn: async () =>
      isSelf
        ? ((await api.get(API_ROUTES.DOCUMENTS.MINE)).data.items as Row[])
        : ((await api.get(API_ROUTES.DOCUMENTS.BASE, { params: { userId, limit: 100 } })).data
            .items as Row[]),
  });

  const setOpen = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("documentId", id);
    else next.delete("documentId");
    setSearchParams(next, { replace: true });
  };

  // Employees with nothing issued don't need an empty card.
  if (!isLoading && items.length === 0 && isSelf && !openId) return null;

  return (
    <div className={`glass-card ${profileStyles.panel}`} style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <CustomIcon name="FolderOpen" size={20} color="var(--accent-primary)" />
        <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
          {isSelf ? "My Documents" : "Documents"}
        </h3>
      </div>
      {isLoading ? (
        <p className={styles.muted}>Loading…</p>
      ) : items.length === 0 ? (
        <p className={styles.muted}>No documents have been issued to this user.</p>
      ) : (
        <ul className={styles.docList}>
          {items.map((d) => (
            <li key={d.id}>
              <button type="button" className={styles.docRow} onClick={() => setOpen(d.id)}>
                <CustomIcon
                  name={DOCUMENT_TYPE_MAP[d.type]?.icon || "FileText"}
                  size={18}
                  color="var(--accent-primary)"
                />
                <span className={styles.docRowMain}>
                  <strong>{d.title}</strong>
                  <small>
                    {docTypeLabel(d.type)} ·{" "}
                    {new Date(d.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </small>
                </span>
                <CustomIcon name="Download" size={16} color="var(--text-muted)" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <DocumentViewerModal documentId={openId} onClose={() => setOpen(null)} />
    </div>
  );
};

export default MyDocumentsCard;
