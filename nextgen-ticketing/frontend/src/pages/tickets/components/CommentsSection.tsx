import { formatDistanceToNow } from "date-fns";
import CustomIcon from "../../../components/CustomIcon";
import CustomInput from "../../../components/CustomInput";
import CustomButton from "../../../components/CustomButton";

const CommentSection = ({
  fullTicketData,
  user,
  canCreateComments,
  handleAddComment,
  setNewComment,
  newComment,
}: any) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        borderLeft: "1px solid var(--border-glass)",
        paddingLeft: 24,
        maxHeight: "100%",
      }}
    >
      <label
        style={{
          fontSize: "1rem",
          color: "var(--text-primary)",
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <CustomIcon
          name="MessageCircle"
          size={20}
          color="var(--accent-primary)"
        />
        Comments{" "}
        {fullTicketData?.comments?.length
          ? `(${fullTicketData.comments.length})`
          : ""}
      </label>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          flex: 1,
          minHeight: 0,
        }}
      >
        {fullTicketData ? (
          <>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                flex: 1,
                maxHeight: "450px",
                overflowY: "auto",
                paddingRight: 8,
              }}
            >
              {fullTicketData.comments?.length > 0 ? (
                fullTicketData.comments.map((comment: any) => (
                  <div
                    key={comment.id}
                    className="glass-card"
                    style={{
                      padding: 12,
                      background:
                        comment.authorId === user?.id
                          ? "rgba(33, 150, 243, 0.05)"
                          : "rgba(255,255,255,0.02)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 6,
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.8rem",
                          color: "var(--accent-primary)",
                        }}
                      >
                        {comment.author.fullname}
                      </span>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.85rem", lineHeight: 1.5 }}>
                      {comment.comment}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "var(--text-muted)",
                    fontSize: "0.9rem",
                    border: "1px dashed var(--border-glass)",
                    borderRadius: 12,
                  }}
                >
                  No comments yet.
                </div>
              )}
            </div>

            {canCreateComments && (
              <form
                onSubmit={handleAddComment}
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: "auto",
                }}
              >
                <CustomInput
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e: any) => setNewComment(e.target.value)}
                  containerStyle={{ flex: 1 }}
                />
                <CustomButton
                  type="submit"
                  variant="gradient"
                  disabled={!newComment.trim()}
                  icon={<CustomIcon name="Send" size={18} />}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                  }}
                />
              </form>
            )}
          </>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "var(--text-muted)",
            }}
          >
            Loading comments...
          </div>
        )}
      </div>
    </div>
  );
};
export default CommentSection;
