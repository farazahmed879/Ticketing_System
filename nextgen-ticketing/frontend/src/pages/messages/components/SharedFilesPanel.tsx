import React from "react";
import CustomIcon from "../../../components/CustomIcon";
import CustomImage from "../../../components/CustomImage";
import styles from "../Messages.module.css";
import { parseChatAttachment } from "../../../utils/attachments";

interface SharedFilesPanelProps {
  sharedFiles: string[];
  onImageClick?: (index: number) => void;
}

/** Media grid + document rows for everything shared in a conversation. */
const SharedFilesPanel: React.FC<SharedFilesPanelProps> = ({
  sharedFiles,
  onImageClick,
}) => {
  const images = sharedFiles.filter((src) => parseChatAttachment(src).isImage);
  const docs = sharedFiles.filter((src) => !parseChatAttachment(src).isImage);

  if (sharedFiles.length === 0) {
    return (
      <div
        style={{
          padding: "24px 12px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "0.85rem",
        }}
      >
        <CustomIcon name="FolderOpen" size={28} style={{ opacity: 0.3 }} />
        <p style={{ marginTop: 8 }}>No files shared in this chat yet</p>
      </div>
    );
  }

  return (
    <div className={styles.sharedFilesBody}>
      {images.length > 0 && (
        <div className={styles.sharedFilesGrid}>
          {images.map((src, idx) => (
            <button
              key={idx}
              type="button"
              className={styles.sharedFileThumb}
              onClick={() => onImageClick?.(idx)}
              title="View image"
            >
              <CustomImage
                src={src}
                alt={`shared-image-${idx}`}
                containerStyle={{ width: "100%", height: "100%" }}
                style={{ objectFit: "cover" }}
                borderRadius="0"
              />
            </button>
          ))}
        </div>
      )}
      {docs.length > 0 && (
        <div className={styles.sharedDocsList}>
          {docs.map((src, idx) => {
            const { name } = parseChatAttachment(src);
            return (
              <a
                key={idx}
                href={src}
                download={name || "file"}
                className={styles.sharedDocRow}
                title={`Download ${name || "file"}`}
              >
                <CustomIcon
                  name="FileText"
                  size={16}
                  color="var(--accent-primary)"
                />
                <span className={styles.sharedDocRowName}>
                  {name || "File"}
                </span>
                <CustomIcon
                  name="Download"
                  size={14}
                  color="var(--text-muted)"
                />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SharedFilesPanel;
