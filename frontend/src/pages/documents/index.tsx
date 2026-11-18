import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import CustomInput from "../../components/CustomInput";
import CustomSelect from "../../components/CustomSelect";
import CustomTable from "../../components/CustomTable";
import CustomPagination from "../../components/CustomPagination";
import CustomBadge from "../../components/CustomBadge";
import CustomTooltip from "../../components/CustomTooltip";
import ConfirmationModal from "../../components/ConfirmationModal";
import Modal from "../../components/Modal";
import StandardListLayout from "../../components/StandardListLayout";
import type { TableColumn } from "../../components/types";
import api from "../../services/api";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useNotification } from "../../context/NotificationContext";
import { canDeleteRecords } from "../../utils/deleteAccess";
import {
  DOCUMENT_TYPES,
  docTypeLabel,
  type DocumentType,
  type HrDocument,
} from "./documentConfig";
import DocumentEditorModal, {
  type DocumentDraft,
  type EmployeeOption,
} from "./DocumentEditorModal";
import DocumentViewerModal from "./DocumentViewerModal";
import { apiErrorMessage, useCompanyProfile } from "./documentApi";
import styles from "./Documents.module.css";

type Row = Pick<
  HrDocument,
  | "id"
  | "type"
  | "title"
  | "userId"
  | "recipientName"
  | "issuedByName"
  | "createdAt"
  | "updatedAt"
>;

const fmtDateTime = (v: string) =>
  new Date(v).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

/** Admin / Sub Admin: generate and manage pay slips, letters and certificates. */
const Documents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newType, setNewType] = useState<DocumentType | null>(null);
  const [editing, setEditing] = useState<HrDocument | null>(null);
  const [toDelete, setToDelete] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const viewingId = searchParams.get("documentId");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const listKey = ["hr-documents", typeFilter, debounced, page, pageSize];
  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: async () =>
      (
        await api.get(API_ROUTES.DOCUMENTS.BASE, {
          params: {
            type: typeFilter || undefined,
            search: debounced || undefined,
            page,
            limit: pageSize,
          },
        })
      ).data as { items: Row[]; total: number },
  });

  const { data: company } = useCompanyProfile();

  const { data: employees = [] } = useQuery({
    queryKey: ["hr-document-employees"],
    queryFn: async () =>
      ((
        await api.get(API_ROUTES.USERS.BASE, {
          params: { type: "employees", limit: -1 },
        })
      ).data.accounts || []) as EmployeeOption[],
    staleTime: 5 * 60 * 1000,
  });

  const openViewer = (id: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set("documentId", id);
    else next.delete("documentId");
    setSearchParams(next, { replace: true });
  };

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["hr-documents"] });

  const save = useMutation({
    mutationFn: async (draft: DocumentDraft) =>
      editing
        ? (await api.put(API_ROUTES.DOCUMENTS.BY_ID(editing.id), draft)).data
            .document
        : (await api.post(API_ROUTES.DOCUMENTS.BASE, draft)).data.document,
    onSuccess: (doc: HrDocument) => {
      const wasEditing = !!editing;
      showNotification(
        "success",
        `${doc.title} ${wasEditing ? "updated" : "generated"}${doc.userId ? " and shared with the employee" : ""}.`,
      );
      setEditing(null);
      setNewType(null);
      refresh();
      queryClient.setQueryData(["hr-document", doc.id], doc);
      openViewer(doc.id);
    },
    onError: (err) =>
      showNotification(
        "error",
        apiErrorMessage(err, "Failed to save document"),
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) =>
      api.delete(API_ROUTES.DOCUMENTS.BY_ID(id)),
    onSuccess: () => {
      showNotification("success", "Document deleted");
      setToDelete(null);
      openViewer(null);
      refresh();
    },
    onError: (err) =>
      showNotification(
        "error",
        apiErrorMessage(err, "Failed to delete document"),
      ),
  });

  const employeeName = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, e.fullname]));
    return (id?: string | null) => (id ? m.get(id) : undefined);
  }, [employees]);

  const canDelete = canDeleteRecords();

  const columns: TableColumn<Row>[] = [
    {
      header: "Document",
      key: "title",
      render: (r) => (
        <div className={styles.recipient}>
          <strong>{r.title}</strong>
          <small>{docTypeLabel(r.type)}</small>
        </div>
      ),
    },
    {
      header: "Issued To",
      key: "recipientName",
      render: (r) => (
        <div className={styles.recipient}>
          <span>{r.recipientName}</span>
          <small>
            {r.userId
              ? employeeName(r.userId)
                ? "Employee"
                : "Employee (inactive)"
              : "External recipient"}
          </small>
        </div>
      ),
    },
    { header: "Issued By", key: "issuedByName" },
    {
      header: "Date",
      key: "createdAt",
      render: (r) => (
        <div className={styles.recipient}>
          <span>{fmtDateTime(r.createdAt)}</span>
          {r.updatedAt !== r.createdAt && (
            <small>Edited {fmtDateTime(r.updatedAt)}</small>
          )}
        </div>
      ),
    },
    {
      header: "",
      key: "actions",
      width: "130px",
      render: (r) => (
        <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
          <CustomTooltip text="View / Download">
            <CustomButton
              variant="ghost"
              size="sm"
              onClick={() => openViewer(r.id)}
              aria-label="View"
            >
              <CustomIcon name="Eye" size={16} />
            </CustomButton>
          </CustomTooltip>
          <CustomTooltip text="Edit">
            <CustomButton
              variant="ghost"
              size="sm"
              aria-label="Edit"
              onClick={async () => {
                try {
                  const doc = (await api.get(API_ROUTES.DOCUMENTS.BY_ID(r.id)))
                    .data.document;
                  setEditing(doc);
                } catch {
                  showNotification("error", "Could not load document");
                }
              }}
            >
              <CustomIcon name="Edit2" size={16} />
            </CustomButton>
          </CustomTooltip>
          {canDelete && (
            <CustomTooltip text="Delete">
              <CustomButton
                variant="ghost"
                size="sm"
                aria-label="Delete"
                onClick={() => setToDelete({ id: r.id, title: r.title })}
              >
                <CustomIcon
                  name="Trash2"
                  size={16}
                  color="var(--accent-danger)"
                />
              </CustomButton>
            </CustomTooltip>
          )}
        </div>
      ),
    },
  ];

  const total = data?.total || 0;
  // Name and logo default to Jami Partners; the signatory has no default.
  const noLetterhead = company && !company.signatoryName?.trim();

  return (
    <div className="animate-fade-in">
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
                Documents
              </h1>
              <p className={styles.subtitle}>
                Generate pay slips, offer letters, certificates and other HR
                documents
              </p>
            </div>
            <div className={styles.headerActions}>
              <CustomButton
                variant="outline"
                icon={<CustomIcon name="Building2" size={18} />}
                onClick={() => navigate("/settings?tab=letterhead")}
              >
                Letterhead
              </CustomButton>
              <CustomButton
                variant="gradient"
                icon={<CustomIcon name="Plus" size={20} />}
                onClick={() => setPickerOpen(true)}
              >
                New Document
              </CustomButton>
            </div>
          </div>
        }
        filters={
          <div className={styles.filters}>
            {noLetterhead && (
              <div
                className={styles.letterheadWarning}
                style={{ width: "100%" }}
              >
                <CustomIcon name="TriangleAlert" size={18} />
                Documents use the Jami Partners name and logo. Add the
                signatory (name, title, signature) and company address in the
                letterhead before issuing documents.
                <CustomButton
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/settings?tab=letterhead")}
                >
                  Complete letterhead
                </CustomButton>
              </div>
            )}
            <CustomInput
              placeholder="Search by recipient or title..."
              value={search}
              icon={<CustomIcon name="Search" size={16} />}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              containerStyle={{ flex: 1, minWidth: 220 }}
            />
            <CustomSelect
              options={[
                { value: "", label: "All types" },
                ...DOCUMENT_TYPES.map((t) => ({ value: t.id, label: t.label })),
              ]}
              value={typeFilter}
              onChange={(v: string) => {
                setTypeFilter(v || "");
                setPage(0);
              }}
              placeholder="All types"
              style={{ minWidth: 200 }}
              showSearch={false}
            />
          </div>
        }
        pagination={
          total > pageSize ? (
            <CustomPagination
              currentPage={page + 1}
              totalPages={Math.ceil(total / pageSize)}
              onPageChange={(p) => setPage(p - 1)}
              totalItems={total}
              itemsPerPage={pageSize}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(0);
              }}
            />
          ) : undefined
        }
      >
        <CustomTable
          columns={columns}
          data={data?.items || []}
          loading={isLoading}
          emptyMessage="No documents yet. Click “New Document” to generate one."
          onRowClick={(r) => openViewer(r.id)}
          highlightRowId={viewingId || undefined}
        />
      </StandardListLayout>

      <Modal
        isOpen={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Choose a document type"
        maxWidth="760px"
      >
        <div className={styles.typeGrid}>
          {DOCUMENT_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={styles.typeCard}
              onClick={() => {
                setPickerOpen(false);
                setEditing(null);
                setNewType(t.id);
              }}
            >
              <span className={styles.typeIcon}>
                <CustomIcon name={t.icon} size={20} />
              </span>
              <span className={styles.typeName}>{t.label}</span>
              <span className={styles.typeDesc}>{t.description}</span>
              {t.employeeOnly ? null : (
                <CustomBadge variant="info">Any recipient</CustomBadge>
              )}
            </button>
          ))}
        </div>
      </Modal>

      {(newType || editing) && (
        <DocumentEditorModal
          key={editing?.id || newType || ""}
          isOpen
          onClose={() => {
            setNewType(null);
            setEditing(null);
          }}
          type={(editing?.type || newType || "custom") as DocumentType}
          editing={editing}
          employees={employees}
          company={company || { name: "" }}
          saving={save.isPending}
          onSave={(draft) => save.mutate(draft)}
        />
      )}

      <DocumentViewerModal
        documentId={viewingId}
        onClose={() => openViewer(null)}
        onEdit={(doc) => {
          openViewer(null);
          setEditing(doc);
        }}
        onDelete={
          canDelete
            ? (doc) => setToDelete({ id: doc.id, title: doc.title })
            : undefined
        }
      />

      <ConfirmationModal
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && remove.mutate(toDelete.id)}
        title="Delete document"
        message={`Delete “${toDelete?.title}”? The employee will no longer see it on their profile.`}
        confirmText="Delete"
        type="danger"
        loading={remove.isPending}
      />
    </div>
  );
};

export default Documents;
