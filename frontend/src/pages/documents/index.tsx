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
import { formatDate, useListViewMode } from "../../utils/helpers";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_MAP,
  docTypeLabel,
  type DocumentType,
  type HrDocument,
} from "./documentConfig";
import DocumentEditorModal, {
  type DocumentDraft,
  type DocumentRequestSeed,
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

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * Editor seed from a document request link (see requests/documentRequest.ts):
 * the pay slip's payment date is the requested month's last day (today if
 * that month isn't over yet), plus addressee / purpose for certificates.
 */
const requestSeedFromParams = (
  p: URLSearchParams,
): (DocumentRequestSeed & { type: DocumentType }) | null => {
  const type = p.get("generate") as DocumentType | null;
  const requestId = p.get("requestId");
  const userId = p.get("userId");
  if (!type || !DOCUMENT_TYPE_MAP[type] || !requestId || !userId) return null;
  const data: Record<string, string> = {};
  const month = p.get("payMonth");
  if (type === "payslip" && month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0);
    data.payDate = isoDay(lastDay < new Date() ? lastDay : new Date());
  }
  const addressedTo = p.get("addressedTo");
  const purpose = p.get("purpose");
  if (addressedTo) data.addressedTo = addressedTo;
  if (purpose) data.purpose = purpose;
  return { type, requestId, userId, data };
};

/** Admin / Sub Admin: generate and manage pay slips, letters and certificates. */
const Documents: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useListViewMode();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [newType, setNewType] = useState<DocumentType | null>(null);
  const [editing, setEditing] = useState<HrDocument | null>(null);
  const [duplicating, setDuplicating] = useState<HrDocument | null>(null);
  // Opened from an employee's document request: /documents?generate=...
  const [fromRequest, setFromRequest] = useState<
    (DocumentRequestSeed & { type: DocumentType }) | null
  >(() => requestSeedFromParams(searchParams));
  useEffect(() => {
    if (!searchParams.has("generate")) return;
    const next = new URLSearchParams(searchParams);
    ["generate", "requestId", "userId", "payMonth", "addressedTo", "purpose"].forEach((k) =>
      next.delete(k),
    );
    setSearchParams(next, { replace: true });
    // Only on mount: the seed was read into state above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      if (fromRequest && doc.userId === fromRequest.userId) {
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      }
      setEditing(null);
      setDuplicating(null);
      setFromRequest(null);
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

  /** Fetch the full document (list rows are summaries), then act on it. */
  const loadThen = async (id: string, then: (doc: HrDocument) => void) => {
    try {
      then((await api.get(API_ROUTES.DOCUMENTS.BY_ID(id))).data.document);
    } catch {
      showNotification("error", "Could not load document");
    }
  };

  // Row actions, shared by the table and the card grid.
  const renderActions = (r: Row) => (
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
              onClick={() => loadThen(r.id, setEditing)}
            >
              <CustomIcon name="Edit2" size={16} />
            </CustomButton>
          </CustomTooltip>
          <CustomTooltip text="Duplicate">
            <CustomButton
              variant="ghost"
              size="sm"
              aria-label="Duplicate"
              onClick={() => loadThen(r.id, setDuplicating)}
            >
              <CustomIcon name="Copy" size={16} />
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
  );

  const issuedToLabel = (r: Row) =>
    r.userId
      ? employeeName(r.userId)
        ? "Employee"
        : "Employee (inactive)"
      : "External recipient";

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
          <small>{issuedToLabel(r)}</small>
        </div>
      ),
    },
    { header: "Issued By", key: "issuedByName" },
    {
      header: "Date",
      key: "createdAt",
      render: (r) => (
        <div className={styles.recipient}>
          <span>{formatDate(r.createdAt)}</span>
          {r.updatedAt !== r.createdAt && (
            <small>Edited {formatDate(r.updatedAt)}</small>
          )}
        </div>
      ),
    },
    {
      header: "",
      key: "actions",
      width: "170px",
      render: (r) => renderActions(r),
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
            <div className={`view-mode-switcher ${styles.switcher}`}>
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
        {viewMode === "list" ? (
          <CustomTable
            columns={columns}
            data={data?.items || []}
            loading={isLoading}
            loadingMessage="Loading documents..."
            emptyMessage="No documents yet. Click “New Document” to generate one."
            onRowClick={(r) => openViewer(r.id)}
            highlightRowId={viewingId || undefined}
          />
        ) : isLoading ? (
          <div className={styles.gridEmpty}>Loading documents...</div>
        ) : !data?.items.length ? (
          <div className={styles.gridEmpty}>
            No documents yet. Click “New Document” to generate one.
          </div>
        ) : (
          <div className={styles.cardGrid}>
            {data.items.map((r) => (
              <div
                key={r.id}
                className={`glass-card ${styles.docCard}`}
                onClick={() => openViewer(r.id)}
              >
                <div className={styles.docCardTop}>
                  <span className={styles.typeIcon}>
                    <CustomIcon
                      name={DOCUMENT_TYPE_MAP[r.type]?.icon || "FileText"}
                      size={20}
                    />
                  </span>
                  <div className={styles.recipient}>
                    <strong>{r.title}</strong>
                    <small>{docTypeLabel(r.type)}</small>
                  </div>
                </div>
                <div className={styles.recipient}>
                  <span>{r.recipientName}</span>
                  <small>{issuedToLabel(r)}</small>
                </div>
                <div className={styles.docCardFooter}>
                  <small>
                    {formatDate(r.createdAt)}
                    {r.issuedByName ? ` · ${r.issuedByName}` : ""}
                  </small>
                  {renderActions(r)}
                </div>
              </div>
            ))}
          </div>
        )}
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
              className={`glass-card ${styles.typeCard}`}
              onClick={() => {
                setPickerOpen(false);
                setEditing(null);
                setDuplicating(null);
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

      {(newType || editing || duplicating || fromRequest) && (
        <DocumentEditorModal
          key={
            editing
              ? `edit-${editing.id}`
              : duplicating
                ? `dup-${duplicating.id}`
                : fromRequest
                  ? `req-${fromRequest.requestId}`
                  : newType || ""
          }
          isOpen
          onClose={() => {
            setNewType(null);
            setEditing(null);
            setDuplicating(null);
            setFromRequest(null);
          }}
          type={
            (editing?.type ||
              duplicating?.type ||
              fromRequest?.type ||
              newType ||
              "custom") as DocumentType
          }
          editing={editing}
          duplicateOf={duplicating}
          fromRequest={fromRequest}
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
        onDuplicate={(doc) => {
          openViewer(null);
          setDuplicating(doc);
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
