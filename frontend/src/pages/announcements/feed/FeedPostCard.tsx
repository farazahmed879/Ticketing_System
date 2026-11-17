import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import CustomBadge from "../../../components/CustomBadge";
import CustomTooltip from "../../../components/CustomTooltip";
import CustomDropdownMenu from "../../../components/CustomDropdownMenu";
import CustomAvatarStack from "../../../components/CustomAvatarStack";
import { FormattedTaskDescription } from "../../timesheet/components/TaskDescriptionEditor";
import { timeAgo } from "../../../utils/helpers";
import { useNotification } from "../../../context/NotificationContext";
import ReactionButton from "./ReactionButton";
import PostAttachments from "./PostAttachments";
import CommentsSection, { type CommentsSectionHandle } from "./CommentsSection";
import { applyReaction, patchPost, refreshPost } from "./feedCache";
import {
  POST_TYPE_STYLE,
  getReaction,
  type FeedPost,
  type FeedUser,
} from "./feedTypes";
import styles from "./Feed.module.css";

interface FeedPostCardProps {
  post: FeedPost;
  me: FeedUser;
  /** Admins/Managers: can edit/delete any post and remove any comment. */
  isModerator: boolean;
  highlighted?: boolean;
  onEdit: (post: FeedPost) => void;
  onDelete: (id: string) => void;
}

/** "You, Ali and 3 others" */
const reactorsSentence = (post: FeedPost, meId: string) => {
  const names = post.reactors.map((r) => (r.id === meId ? "You" : r.fullname));
  if (post.reactionTotal <= 2) return names.join(" and ");
  return `${names[0]} and ${post.reactionTotal - 1} others`;
};

const FeedPostCard = ({
  post,
  me,
  isModerator,
  highlighted,
  onEdit,
  onDelete,
}: FeedPostCardProps) => {
  const qc = useQueryClient();
  const { showNotification } = useNotification();
  const [showComments, setShowComments] = useState(post.commentCount > 0);
  const [expanded, setExpanded] = useState(false);
  const commentsRef = useRef<CommentsSectionHandle>(null);

  const typeStyle = POST_TYPE_STYLE[post.type] || {
    variant: "neutral" as const,
    icon: "Megaphone",
    label: post.type,
  };
  const canManage = isModerator || post.authorId === me.id;

  const reactMutation = useMutation({
    mutationFn: (type: string | null) =>
      api.put(API_ROUTES.ANNOUNCEMENTS.REACTION(post.id), { type }),
    // Update instantly; the server response (or a refresh on error) settles it.
    onMutate: (type) => patchPost(qc, post.id, (p) => applyReaction(p, type, me)),
    onSuccess: (res) => patchPost(qc, post.id, () => res.data.post),
    onError: () => {
      showNotification("error", "Couldn't save your reaction");
      refreshPost(qc, post.id);
    },
  });

  // Top 3 reaction types by count, for the emoji bubbles.
  const topReactions = Object.entries(post.reactionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type]) => getReaction(type))
    .filter(Boolean);

  const reactorLines = post.reactors
    .map((r) => `${getReaction(r.type)?.emoji || ""} ${r.id === me.id ? "You" : r.fullname}`)
    .concat(
      post.reactionTotal > post.reactors.length
        ? [`and ${post.reactionTotal - post.reactors.length} more`]
        : [],
    );

  const eventDate = new Date(post.date);
  const showEventDate =
    !isNaN(eventDate.getTime()) &&
    format(eventDate, "yyyy-MM-dd") !== format(new Date(post.createdAt), "yyyy-MM-dd");

  return (
    <article
      className={`glass-card ${styles.post} ${highlighted ? styles.postHighlighted : ""}`}
    >
      {/* Header: author · time · audience | type badge · menu */}
      <div className={styles.postHeader}>
        <CustomAvatarStack
          items={[
            {
              id: post.author.id,
              name: post.author.fullname,
              image: post.author.image || undefined,
            },
          ]}
          limit={1}
          size={42}
        />
        <div className={styles.postMeta}>
          <span className={styles.authorName}>{post.author.fullname}</span>
          <span className={styles.subMeta}>
            <span>{post.author.title || post.author.role?.name || "Member"}</span>
            <span className={styles.dot} />
            <CustomTooltip text={format(new Date(post.createdAt), "PPpp")}>
              <span>{timeAgo(post.createdAt)}</span>
            </CustomTooltip>
            <span className={styles.dot} />
            <CustomTooltip
              text={post.isProjectTeamOnly ? "Visible to the project team" : "Visible to everyone"}
            >
              <CustomIcon name={post.isProjectTeamOnly ? "Lock" : "Globe"} size={12} />
            </CustomTooltip>
          </span>
        </div>
        <div className={styles.headerRight}>
          <CustomBadge variant={typeStyle.variant}>{typeStyle.label}</CustomBadge>
          {canManage && (
            <CustomDropdownMenu
              triggerIcon="MoreHorizontal"
              position="right"
              items={[
                { label: "Edit", icon: "Edit2", onClick: () => onEdit(post) },
                {
                  label: "Delete",
                  icon: "Trash2",
                  danger: true,
                  onClick: () => onDelete(post.id),
                },
              ]}
            />
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.postBody}>
        <h3 className={styles.postTitle}>{post.title}</h3>
        <div className={styles.postText}>
          <FormattedTaskDescription content={post.description} />
        </div>
        <PostAttachments attachments={post.attachments} />
        {(showEventDate || post.project) && (
          <div className={styles.chips}>
            {showEventDate && (
              <span className={styles.chip}>
                <CustomIcon name={typeStyle.icon} size={12} />
                {format(eventDate, "EEE, MMM d, yyyy")}
              </span>
            )}
            {post.project && (
              <span className={styles.chip}>
                <CustomIcon name="FolderKanban" size={12} />
                {post.project.name}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Stats: reactions summary · comment count */}
      {(post.reactionTotal > 0 || post.commentCount > 0) && (
        <div className={styles.stats}>
          {post.reactionTotal > 0 ? (
            <span className={styles.reactionSummary} tabIndex={0}>
              <span className={styles.emojiStack}>
                {topReactions.map((r) => (
                  <span key={r!.type} className={styles.emojiBubble}>
                    {r!.emoji}
                  </span>
                ))}
              </span>
              {reactorsSentence(post, me.id)}
              {/* Who reacted (shown on hover/focus) */}
              <span className={styles.reactorsPopover} role="tooltip">
                {reactorLines.map((line, i) => (
                  <span key={i}>{line}</span>
                ))}
              </span>
            </span>
          ) : (
            <span />
          )}
          {post.commentCount > 0 && (
            <button
              type="button"
              className={styles.statBtn}
              onClick={() => {
                setShowComments(true);
                setExpanded(true);
              }}
            >
              {post.commentCount} comment{post.commentCount === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        <ReactionButton
          myReaction={post.myReaction}
          onReact={(type) => reactMutation.mutate(type)}
        />
        <button
          type="button"
          className={styles.actionBtn}
          onClick={() => {
            setShowComments(true);
            // Wait for the section to mount before focusing.
            setTimeout(() => commentsRef.current?.focus(), 0);
          }}
        >
          <CustomIcon name="MessageCircle" size={18} />
          Comment
        </button>
      </div>

      {showComments && (
        <CommentsSection
          ref={commentsRef}
          post={post}
          me={me}
          canModerate={isModerator}
          expanded={expanded}
          onExpand={() => setExpanded(true)}
        />
      )}
    </article>
  );
};

export default FeedPostCard;
