import React, { useRef, useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import {
  CHAT_ACCEPT_ATTRIBUTE,
  MAX_ATTACHMENTS,
  dataUrlBytes,
  formatBytes,
  parseChatAttachment,
  readAttachmentFiles,
} from "../../../utils/attachments";
import styles from "./Feed.module.css";

interface AttachmentPickerProps {
  value: string[];
  onChange: (next: string[]) => void;
}

/** Image + document picker for shoutouts. Images show as thumbnails, files as chips. */
const AttachmentPicker: React.FC<AttachmentPickerProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setError(null);
    setReading(true);
    const { accepted, errors } = await readAttachmentFiles(files, value.length, {
      allowDocuments: true,
      optimize: true,
    });
    setReading(false);
    if (accepted.length) onChange([...value, ...accepted]);
    if (errors.length) setError(errors.join(" "));
    // Reset so picking the same file again still fires onChange.
    e.target.value = "";
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
    setError(null);
  };

  return (
    <div className={styles.attach}>
      <div className={styles.attachHeader}>
        <span className={styles.attachLabel}>
          <CustomIcon name="Paperclip" size={14} />
          Photos & files (optional)
        </span>
        <span className={styles.attachCount}>
          {value.length > 0 &&
            `${formatBytes(value.reduce((sum, a) => sum + dataUrlBytes(a), 0))} · `}
          {value.length} / {MAX_ATTACHMENTS}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={CHAT_ACCEPT_ATTRIBUTE}
        multiple
        onChange={handleSelect}
        style={{ display: "none" }}
      />

      <div className={styles.attachItems}>
        {value.map((src, idx) => {
          const { isImage, name } = parseChatAttachment(src);
          return (
            <div
              key={idx}
              className={isImage ? styles.attachThumb : styles.attachFile}
              title={`${name ? `${name} · ` : ""}${formatBytes(dataUrlBytes(src))}`}
            >
              {isImage ? (
                <img src={src} alt={`attachment-${idx + 1}`} />
              ) : (
                <>
                  <CustomIcon name="FileText" size={18} />
                  <span className={styles.attachFileName}>{name || "File"}</span>
                </>
              )}
              <button
                type="button"
                className={styles.attachRemove}
                onClick={() => remove(idx)}
                title="Remove"
              >
                <CustomIcon name="X" size={12} />
              </button>
            </div>
          );
        })}

        {value.length < MAX_ATTACHMENTS && (
          <button
            type="button"
            className={styles.attachAdd}
            onClick={() => inputRef.current?.click()}
            disabled={reading}
            title="Add photo or file"
          >
            <CustomIcon name={reading ? "Loader" : "ImagePlus"} size={20} />
            <span>{reading ? "Compressing..." : "Add"}</span>
          </button>
        )}
      </div>

      <span className={styles.attachHint}>
        Images, PDF, Word, Excel, PowerPoint, TXT, CSV or ZIP · auto-compressed, up to
        15MB per file (2MB after compression)
      </span>
      {error && <span className={styles.attachError}>{error}</span>}
    </div>
  );
};

export default AttachmentPicker;
