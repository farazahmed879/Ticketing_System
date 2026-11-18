import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { canDeleteRecords } from "../../../utils/deleteAccess";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import CustomIcon from "../../../components/CustomIcon";
import CustomAvatarStack from "../../../components/CustomAvatarStack";
import { timeAgo } from "../../../utils/helpers";
import { useNotification } from "../../../context/NotificationContext";
import { COMMENTS_KEY, refreshPost } from "./feedCache";
import type { FeedComment, FeedPost, FeedUser } from "./feedTypes";
import styles from "./Feed.module.css";

export interface CommentsSectionHandle {
  focus: () => void;
}

interface CommentsSectionProps {
  post: FeedPost;
  me: FeedUser;
  /** Admins/Managers can remove any comment. */
  canModerate: boolean;
  expanded: boolean;
  onExpand: () => void;
}

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } }).response?.data
    ?.message || fallback;

const Avatar = ({ user, size = 32 }: { user: FeedUser; size?: number }) => (
  <CustomAvatarStack
    items={[{ id: user.id, name: user.fullname, image: user.image || undefined }]}
    limit={1}
    size={size}
  />
);

/** Comment list (latest 2 until expanded) + "write a comment" box. */
const CommentsSection = forwardRef<CommentsSectionHandle, CommentsSectionProps>(
  ({ post, me, canModerate, expanded, onExpand }, ref) => {
    const qc = useQueryClient();
    const { showNotification } = useNotification();
    const [text, setText] = useState("");
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    // Full list only once the user asks for it.
    const { data: allComments, isFetching } = useQuery({
      queryKey: [COMMENTS_KEY, post.id],
      queryFn: async () => {
        const res = await api.get(API_ROUTES.ANNOUNCEMENTS.COMMENTS(post.id));
        return res.data.comments as FeedComment[];
      },
      enabled: expanded,
    });

    const comments = expanded && allComments ? allComments : post.recentComments;
    const hiddenCount = post.commentCount - comments.length;

    const addMutation = useMutation({
      mutationFn: (content: string) =>
        api.post(API_ROUTES.ANNOUNCEMENTS.COMMENTS(post.id), { content }),
      onSuccess: () => {
        setText("");
        if (inputRef.current) inputRef.current.style.height = "auto";
        refreshPost(qc, post.id);
      },
      onError: (err) =>
        showNotification("error", errorMessage(err, "Failed to post comment")),
    });

    const deleteMutation = useMutation({
      mutationFn: (commentId: string) =>
        api.delete(API_ROUTES.ANNOUNCEMENTS.COMMENT(post.id, commentId)),
      onSuccess: () => refreshPost(qc, post.id),
      onError: (err) =>
        showNotification("error", errorMessage(err, "Failed to delete comment")),
    });

    const submit = () => {
      const content = text.trim();
      if (!content || addMutation.isPending) return;
      addMutation.mutate(content);
    };

    return (
      <div className={styles.comments}>
        {hiddenCount > 0 && (
          <button type="button" className={styles.statBtn} onClick={onExpand}>
            {isFetching
              ? "Loading comments..."
              : `View ${hiddenCount} more comment${hiddenCount === 1 ? "" : "s"}`}
          </button>
        )}

        {comments.map((c) => {
          const canDelete =
            c.user.id === me.id ||
            post.authorId === me.id ||
            (canModerate && canDeleteRecords());
          return (
            <div key={c.id} className={styles.comment}>
              <Avatar user={c.user} />
              <div className={styles.commentBody}>
                <div className={styles.commentBubble}>
                  <div className={styles.commentAuthor}>{c.user.fullname}</div>
                  <div className={styles.commentText}>{c.content}</div>
                </div>
                <div className={styles.commentFooter}>
                  <span>{timeAgo(c.createdAt)}</span>
                  {canDelete && (
                    <button
                      type="button"
                      className={styles.commentDelete}
                      onClick={() => deleteMutation.mutate(c.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div className={styles.commentForm}>
          <Avatar user={me} />
          <div className={styles.commentInputWrap}>
            <textarea
              ref={inputRef}
              rows={1}
              className={styles.commentInput}
              placeholder="Write a comment..."
              value={text}
              maxLength={2000}
              onChange={(e) => {
                setText(e.target.value);
                // Auto-grow up to the CSS max-height.
                e.target.style.height = "auto";
                e.target.style.height = `${e.target.scrollHeight}px`;
              }}
              onKeyDown={(e) => {
                // Enter sends, Shift+Enter adds a new line.
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={submit}
              disabled={!text.trim() || addMutation.isPending}
              aria-label="Send comment"
            >
              <CustomIcon name="SendHorizontal" size={15} />
            </button>
          </div>
        </div>
      </div>
    );
  },
);

CommentsSection.displayName = "CommentsSection";

export default CommentsSection;
