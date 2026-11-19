import React from "react";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import { apiErrorMessage, useHrDocument } from "./documentApi";
import DocumentPaper from "./DocumentPaper";
import CustomSkeleton from "../../components/CustomSkeleton";
import { type HrDocument } from "./documentConfig";
import { documentFileName, printDocument } from "./printDocument";
import styles from "./Documents.module.css";
import { formatDate } from "../../utils/helpers";

interface Props {
  documentId: string | null;
  onClose: () => void;
  /** Admin actions; omitted for employees viewing their own documents. */
  onEdit?: (doc: HrDocument) => void;
  onDuplicate?: (doc: HrDocument) => void;
  onDelete?: (doc: HrDocument) => void;
  /** Hand a draft to its employee. */
  onDeliver?: (doc: HrDocument) => void;
}

const DocumentViewerModal: React.FC<Props> = ({
  documentId,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onDeliver,
}) => {
  const { data: doc, isLoading, isError, error } = useHrDocument(documentId);

  const download = () =>
    doc &&
    printDocument(
      { type: doc.type, recipientName: doc.recipientName, data: doc.data, company: doc.company },
      documentFileName(doc.title, doc.recipientName),
    );

  const footer = doc && (
    <div className={styles.modalFooter}>
      {onDelete && (
        <CustomButton
          variant="danger"
          icon={<CustomIcon name="Trash2" size={16} />}
          onClick={() => onDelete(doc)}
        >
          Delete
        </CustomButton>
      )}
      <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
        {onDuplicate && (
          <CustomButton
            variant="outline"
            icon={<CustomIcon name="Copy" size={16} />}
            onClick={() => onDuplicate(doc)}
          >
            Duplicate
          </CustomButton>
        )}
        {onEdit && (
          <CustomButton
            variant="outline"
            icon={<CustomIcon name="Edit2" size={16} />}
            onClick={() => onEdit(doc)}
          >
            Edit
          </CustomButton>
        )}
        {onDeliver && doc.userId && !doc.delivered && (
          <CustomButton
            variant="outline"
            icon={<CustomIcon name="Send" size={16} />}
            onClick={() => onDeliver(doc)}
            title="Share this document with the employee"
          >
            Deliver
          </CustomButton>
        )}
        <CustomButton
          variant="gradient"
          icon={<CustomIcon name="Download" size={16} />}
          onClick={download}
          title="Opens the print dialog — choose “Save as PDF” to download"
        >
          Download PDF
        </CustomButton>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={!!documentId}
      onClose={onClose}
      title={doc ? `${doc.title} — ${doc.recipientName}` : "Document"}
      maxWidth="900px"
      footer={footer || undefined}
    >
      {isLoading && <CustomSkeleton height={520} />}
      {isError && (
        <p className={styles.error}>
          {/* e.g. "Documents are locked..." from the server */}
          {apiErrorMessage(error, "This document could not be loaded.")}
        </p>
      )}
      {doc && onDeliver && doc.userId && (
        <p className={styles.deliveryNote}>
          {doc.delivered
            ? `Delivered to ${doc.recipientName}${doc.deliveredAt ? ` on ${formatDate(doc.deliveredAt)}` : ""}${doc.deliveredByName ? ` by ${doc.deliveredByName}` : ""}.`
            : `Draft: ${doc.recipientName} can't see this document until you deliver it.`}
        </p>
      )}
      {doc && (
        <div className={styles.viewerPane}>
          <div className={styles.paperScaler}>
            <DocumentPaper
              type={doc.type}
              recipientName={doc.recipientName}
              data={doc.data}
              company={doc.company}
            />
          </div>
        </div>
      )}
    </Modal>
  );
};

export default DocumentViewerModal;
