import React from "react";
import Modal from "../../components/Modal";
import CustomButton from "../../components/CustomButton";
import CustomIcon from "../../components/CustomIcon";
import { useHrDocument } from "./documentApi";
import DocumentPaper from "./DocumentPaper";
import CustomSkeleton from "../../components/CustomSkeleton";
import { type HrDocument } from "./documentConfig";
import { documentFileName, printDocument } from "./printDocument";
import styles from "./Documents.module.css";

interface Props {
  documentId: string | null;
  onClose: () => void;
  /** Admin actions; omitted for employees viewing their own documents. */
  onEdit?: (doc: HrDocument) => void;
  onDuplicate?: (doc: HrDocument) => void;
  onDelete?: (doc: HrDocument) => void;
}

const DocumentViewerModal: React.FC<Props> = ({
  documentId,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const { data: doc, isLoading, isError } = useHrDocument(documentId);

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
      {isError && <p className={styles.error}>This document could not be loaded.</p>}
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
