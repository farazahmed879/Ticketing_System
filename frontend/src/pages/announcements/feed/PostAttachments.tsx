import React, { useState } from "react";
import CustomIcon from "../../../components/CustomIcon";
import Lightbox from "../../messages/components/Lightbox";
import { downloadAttachment, parseChatAttachment } from "../../../utils/attachments";
import styles from "./Feed.module.css";

/** Max photos in the grid; the last tile shows "+N" for the rest. */
const GRID_LIMIT = 4;

/** Facebook-style photo grid + downloadable file chips under a shoutout. */
const PostAttachments: React.FC<{ attachments?: string[] }> = ({ attachments }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  if (!attachments?.length) return null;

  const images = attachments.filter((a) => parseChatAttachment(a).isImage);
  const files = attachments.filter((a) => !parseChatAttachment(a).isImage);
  const shown = images.slice(0, GRID_LIMIT);
  const extra = images.length - shown.length;

  return (
    <>
      {shown.length > 0 && (
        <div className={`${styles.photoGrid} ${styles[`photoGrid${shown.length}`]}`}>
          {shown.map((src, i) => (
            <button
              key={i}
              type="button"
              className={styles.photo}
              onClick={() => setOpenIndex(i)}
              title="View photo"
            >
              <img src={src} alt={`photo ${i + 1}`} loading="lazy" />
              {extra > 0 && i === shown.length - 1 && (
                <span className={styles.photoMore}>+{extra}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className={styles.fileList}>
          {files.map((src, i) => {
            const { name } = parseChatAttachment(src);
            return (
              <button
                key={i}
                type="button"
                onClick={() => downloadAttachment(src)}
                className={styles.fileChip}
                title={`Download ${name || "file"}`}
              >
                <CustomIcon name="FileText" size={18} />
                <span className={styles.fileChipName}>{name || "File"}</span>
                <CustomIcon name="Download" size={15} />
              </button>
            );
          })}
        </div>
      )}

      {openIndex !== null && (
        <Lightbox images={images} index={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
};

export default PostAttachments;
