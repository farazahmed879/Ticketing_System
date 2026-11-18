import React from "react";
import Drawer from "../../../components/Drawer";
import CustomBadge from "../../../components/CustomBadge";
import CustomButton from "../../../components/CustomButton";
import CustomIcon from "../../../components/CustomIcon";
import CustomAvatarStack from "../../../components/CustomAvatarStack";
import { FormattedTaskDescription } from "../../timesheet/components/TaskDescriptionEditor";
import { timeAgo } from "../../../utils/helpers";
import { formatRequestType, getReviewerLabel } from "../columns";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { ROLE_TYPE } from "../../roles/roleConstants";
import {
  documentRequestSummary,
  isDocumentRequest,
  issuedDocumentLink,
} from "../documentRequest";
import type { UserRequest } from "../../../types";
import styles from "./RequestDetailsDrawer.module.css";

const LEAVE_TYPES = new Set(["HALFDAY_LEAVE", "FULLDAY_LEAVE", "VACATION"]);

// Parse "YYYY-MM-DD" as a local date so it doesn't shift a day in some timezones.
const parseDay = (s: string) =>
  new Date(/^\d{4}-\d{2}-\d{2}$/.test(s) ? `${s}T00:00:00` : s);

const formatDay = (s?: string) =>
  s
    ? parseDay(s).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

const formatDateTime = (s?: string) =>
  s
    ? new Date(s).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

/** Leave days, counted the same way the server deducts them (weekdays only). */
const leaveDays = (r: UserRequest): number | null => {
  if (!LEAVE_TYPES.has(r.type)) return null;
  if (r.type === "HALFDAY_LEAVE") return 0.5;
  const start = r.data?.startDate;
  if (!start) return null;
  const cur = parseDay(start);
  const end = parseDay(r.data?.endDate || start);
  let n = 0;
  while (cur <= end) {
    const d = cur.getDay();
    if (d !== 0 && d !== 6) n++;
    cur.setDate(cur.getDate() + 1);
  }
  return n;
};

const statusVariant = (status: string) =>
  status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "warning";

const Person = ({
  person,
}: {
  person: { id?: string; fullname: string; email?: string; image?: string };
}) => (
  <div className={styles.person}>
    <CustomAvatarStack
      items={[{ id: person.id || person.fullname, name: person.fullname, image: person.image }]}
      limit={1}
      size={36}
    />
    <div className={styles.personText}>
      <span className={styles.personName}>{person.fullname}</span>
      {person.email && <span className={styles.personEmail}>{person.email}</span>}
    </div>
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className={styles.field}>
    <span className={styles.label}>{label}</span>
    <div className={styles.value}>{children}</div>
  </div>
);

interface RequestDetailsDrawerProps {
  request: UserRequest | null;
  onClose: () => void;
  canDelete: boolean;
  onUpdateStatus: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

const RequestDetailsDrawer: React.FC<RequestDetailsDrawerProps> = ({
  request,
  onClose,
  canDelete,
  onUpdateStatus,
  onDelete,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  if (!request) return null;

  const r = request;
  const isDoc = isDocumentRequest(r);
  const isAdmin = user?.role?.roleType === ROLE_TYPE.ADMIN;
  const documentId = r.data?.documentId;
  const days = leaveDays(r);
  const start = r.data?.startDate;
  const end = r.data?.endDate;
  const isRange = !!start && !!end && end !== start;
  const canReview = r.status === "PENDING" && !!r.canReview;
  const decided = r.status !== "PENDING";

  const footer =
    canReview || canDelete ? (
      <>
        {canDelete && (
          <CustomButton
            variant="ghost"
            onClick={() => onDelete(r.id)}
            icon={<CustomIcon name="Trash2" size={16} />}
            style={{ color: "var(--accent-danger)", marginRight: "auto" }}
          >
            Delete
          </CustomButton>
        )}
        {canReview && (
          <>
            <CustomButton
              variant="ghost"
              onClick={() => onUpdateStatus(r.id, "REJECTED")}
              icon={<CustomIcon name="XCircle" size={16} />}
              style={{ color: "var(--accent-danger)" }}
            >
              Reject
            </CustomButton>
            <CustomButton
              variant="gradient"
              onClick={() => onUpdateStatus(r.id, "APPROVED")}
              icon={<CustomIcon name={isDoc ? "FileSignature" : "CheckCircle2"} size={16} />}
            >
              {isDoc ? "Generate document" : "Approve"}
            </CustomButton>
          </>
        )}
      </>
    ) : undefined;

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={formatRequestType(r.type)}
      subtitle={<CustomBadge variant={statusVariant(r.status)}>{r.status}</CustomBadge>}
      footer={footer}
    >
      <div className={styles.body}>
        <Field label="Requested by">
          {r.user ? (
            <Person person={{ ...r.user, email: r.email || r.user.email }} />
          ) : (
            <span className={styles.muted}>{r.email || "Anonymous"}</span>
          )}
        </Field>

        {start && (
          <div className={styles.grid}>
            <Field label={isRange ? "From" : "Date"}>{formatDay(start)}</Field>
            {isRange && <Field label="To">{formatDay(end)}</Field>}
            {days !== null && (
              <Field label="Duration">
                {days} {days === 1 ? "day" : "days"}
                {r.type !== "HALFDAY_LEAVE" && (
                  <span className={styles.muted}> (weekdays)</span>
                )}
              </Field>
            )}
          </div>
        )}

        {isDoc && (
          <>
            <Field label="Document">{documentRequestSummary(r)}</Field>
            {(r.data?.addressedTo || r.data?.purpose) && (
              <div className={styles.grid}>
                {r.data?.addressedTo && (
                  <Field label="Addressed to">{r.data.addressedTo}</Field>
                )}
                {r.data?.purpose && <Field label="Purpose">{r.data.purpose}</Field>}
              </div>
            )}
            {documentId && (
              <Field label="Issued document">
                <CustomButton
                  variant="outline"
                  size="sm"
                  icon={<CustomIcon name="FileText" size={16} />}
                  onClick={() => navigate(issuedDocumentLink(documentId, isAdmin))}
                >
                  View document
                </CustomButton>
              </Field>
            )}
          </>
        )}

        <Field label="Message">
          {r.message ? (
            <div className={styles.message}>
              <FormattedTaskDescription content={r.message} />
            </div>
          ) : (
            <span className={styles.muted}>No message provided.</span>
          )}
        </Field>

        <Field label={decided ? getReviewerLabel(r.status) : "Approved / Rejected by"}>
          {decided && r.approvedBy ? (
            <Person person={r.approvedBy} />
          ) : (
            <span className={styles.muted}>
              {decided ? "—" : "Awaiting review"}
            </span>
          )}
        </Field>

        <div className={styles.grid}>
          <Field label="Submitted">
            {formatDateTime(r.createdAt)}
            <span className={styles.muted}> · {timeAgo(r.createdAt)}</span>
          </Field>
          {decided && r.updatedAt && (
            <Field label="Last updated">{formatDateTime(r.updatedAt)}</Field>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default RequestDetailsDrawer;
