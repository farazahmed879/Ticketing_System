import React from "react";
import CustomIcon from "../../../components/CustomIcon";
import { useNotification } from "../../../context/NotificationContext";
import type { ProjectLink } from "../../../types";
import styles from "../ProjectDetail.module.css";

const isWebLink = (url: string) => /^https?:\/\//i.test(url);

/** "github.com/org/repo" style short text for a link. */
const shortUrl = (url: string) => {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname === "/" ? "" : u.pathname}`.replace(/\.git$/, "");
  } catch {
    return url; // e.g. git@github.com:org/repo.git
  }
};

const LinkRow: React.FC<{ link: ProjectLink; icon: string }> = ({ link, icon }) => {
  const { showNotification } = useNotification();
  const web = isWebLink(link.url);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      showNotification("success", "Link copied");
    } catch {
      showNotification("error", "Couldn't copy the link");
    }
  };

  return (
    <div className={styles.linkRow}>
      <span className={styles.linkIcon}>
        <CustomIcon name={icon} size={16} />
      </span>
      <div className={styles.itemText}>
        {link.label && <div className={styles.linkLabel}>{link.label}</div>}
        {web ? (
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.linkUrl}
            title={link.url}
          >
            {shortUrl(link.url)}
          </a>
        ) : (
          <span className={styles.linkUrl} title={link.url}>
            {link.url}
          </span>
        )}
      </div>
      <button type="button" className={styles.linkAction} onClick={copy} title="Copy link">
        <CustomIcon name="Copy" size={14} />
      </button>
      {web && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.linkAction}
          title="Open in new tab"
        >
          <CustomIcon name="ExternalLink" size={14} />
        </a>
      )}
    </div>
  );
};

interface ProjectLinksCardProps {
  siteUrls?: ProjectLink[];
  /** Undefined for clients (the API hides repositories from them). */
  gitRepos?: ProjectLink[];
  /** Show the card with an empty state even when there are no links. */
  showEmpty?: boolean;
}

/** Sidebar card with the project's site URLs and git repositories. */
const ProjectLinksCard: React.FC<ProjectLinksCardProps> = ({
  siteUrls = [],
  gitRepos = [],
  showEmpty,
}) => {
  if (!siteUrls.length && !gitRepos.length && !showEmpty) return null;

  return (
    <div className={`glass-card ${styles.card}`}>
      <div className={`${styles.sectionHead} ${styles.sectionHeadTight}`}>
        <CustomIcon name="Link" size={20} color="var(--accent-primary)" />
        <h3 className={styles.sectionTitle}>Links</h3>
      </div>

      {!siteUrls.length && !gitRepos.length && (
        <p className={styles.linkEmpty}>
          No site URLs or repositories yet. Add them from Edit Project.
        </p>
      )}

      {siteUrls.length > 0 && (
        <div className={styles.linkGroup}>
          <span className={styles.linkGroupTitle}>Sites</span>
          {siteUrls.map((link, i) => (
            <LinkRow key={`site-${i}`} link={link} icon="Globe" />
          ))}
        </div>
      )}

      {gitRepos.length > 0 && (
        <div className={styles.linkGroup}>
          <span className={styles.linkGroupTitle}>Repositories</span>
          {gitRepos.map((link, i) => (
            <LinkRow key={`repo-${i}`} link={link} icon="GitBranch" />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectLinksCard;
