import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import CustomIcon from "../../components/CustomIcon";
import CustomButton from "../../components/CustomButton";
import CustomInput from "../../components/CustomInput";
import CustomAvatarStack from "../../components/CustomAvatarStack";
import ConfirmationModal from "../../components/ConfirmationModal";
import StandardListLayout from "../../components/StandardListLayout";
import AnnouncementModal from "./components/AnnouncementModal";
import FeedPostCard from "./feed/FeedPostCard";
import FeedColumn, { type FeedFilter } from "./feed/FeedColumn";
import { FEED_KEY, FEED_POST_KEY, refreshPost } from "./feed/feedCache";
import type { FeedPost } from "./feed/feedTypes";
import styles from "./feed/Feed.module.css";
import api from "../../services/api";
import { socket } from "../../services/socket";
import { API_ROUTES } from "../../utils/apiRoutes";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { ROLE_TYPE } from "../roles/roleConstants";
import { AnnouncementType } from "../../utils/constants";

type LaneId = "important" | "feed" | "events";

const LANES: {
  id: LaneId;
  title: string;
  icon: string;
  accent: string;
  filter: FeedFilter;
  emptyText: string;
}[] = [
  {
    id: "important",
    title: "Important & Info",
    icon: "AlertTriangle",
    accent: "#ef4444",
    filter: { types: [AnnouncementType.IMPORTANT, AnnouncementType.INFO] },
    emptyText: "No important updates right now.",
  },
  {
    id: "feed",
    title: "Moments & Reviews",
    icon: "Award",
    accent: "#6366f1",
    filter: {
      excludeTypes: [
        AnnouncementType.IMPORTANT,
        AnnouncementType.INFO,
        AnnouncementType.EVENT,
      ],
    },
    emptyText: "No posts yet.",
  },
  {
    id: "events",
    title: "Events",
    icon: "Calendar",
    accent: "#0ea5e9",
    filter: { types: [AnnouncementType.EVENT] },
    emptyText: "No upcoming events.",
  },
];

/** Shoutouts wall: a Facebook-style feed with reactions and comments. */
const AnnouncementFeed: React.FC = () => {
  const { user } = useAuth();
  const isCustomer = user?.role?.roleType === ROLE_TYPE.CUSTOMER;
  const entityName = isCustomer ? "Review" : "Shoutout";
  const entityNamePlural = isCustomer ? "Reviews" : "Shoutouts";
  const isModerator =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.roleType === ROLE_TYPE.AGENT;
  const canCreate =
    user?.role?.roleType === ROLE_TYPE.ADMIN ||
    user?.role?.permissions?.announcements?.create === true;

  const me = {
    id: user?.id || "",
    fullname: user?.fullname || "You",
    image: user?.image,
  };

  const queryClient = useQueryClient();
  const { showNotification, setIsLoading } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const pinnedId = searchParams.get("postId");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FeedPost | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  // Which lane is visible on narrow screens (all three show side by side on desktop).
  const [activeLane, setActiveLane] = useState<LaneId>("feed");

  const scrollRef = useRef<HTMLDivElement>(null);

  // ---------- Data ----------

  // A post opened from a notification is pinned at the top.
  const pinned = useQuery({
    queryKey: [FEED_POST_KEY, pinnedId],
    queryFn: async () => {
      const res = await api.get(API_ROUTES.ANNOUNCEMENTS.FEED_POST(pinnedId!));
      return res.data.post as FeedPost;
    },
    enabled: !!pinnedId,
    retry: false,
  });

  // Live updates from other users.
  useEffect(() => {
    const onActivity = (payload?: { announcementId?: string }) => {
      if (payload?.announcementId)
        refreshPost(queryClient, payload.announcementId);
    };
    const onUpdated = () =>
      queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
    socket.on("announcement:activity", onActivity);
    socket.on("announcement:updated", onUpdated);
    return () => {
      socket.off("announcement:activity", onActivity);
      socket.off("announcement:updated", onUpdated);
    };
  }, [queryClient]);

  // ---------- Create / edit / delete ----------

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: [FEED_KEY] });
    queryClient.invalidateQueries({ queryKey: [FEED_POST_KEY] });
    queryClient.invalidateQueries({ queryKey: ["announcements"] });
    queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: unknown) =>
      editingPost
        ? api.put(API_ROUTES.ANNOUNCEMENTS.BY_ID(editingPost.id), data)
        : api.post(API_ROUTES.ANNOUNCEMENTS.BASE, data),
    onMutate: () => setIsLoading(true, `Saving ${entityName.toLowerCase()}...`),
    onSettled: () => setIsLoading(false, ""),
    onSuccess: () => {
      invalidateAll();
      showNotification(
        "success",
        `${entityName} ${editingPost ? "updated" : "posted"} successfully`,
      );
      setIsModalOpen(false);
      setEditingPost(null);
      if (!editingPost)
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    },
    onError: () => showNotification("error", "Operation failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(API_ROUTES.ANNOUNCEMENTS.BY_ID(id)),
    onSuccess: (_, id) => {
      invalidateAll();
      if (id === pinnedId) setSearchParams({});
      showNotification("success", `${entityName} deleted`);
      setPostToDelete(null);
    },
    onError: () => {
      showNotification("error", `Failed to delete ${entityName.toLowerCase()}`);
      setPostToDelete(null);
    },
  });

  const openComposer = () => {
    setEditingPost(null);
    setIsModalOpen(true);
  };

  const cardProps = {
    me,
    isModerator,
    onEdit: (p: FeedPost) => {
      setEditingPost(p);
      setIsModalOpen(true);
    },
    onDelete: (id: string) => setPostToDelete(id),
  };

  // ---------- Render ----------

  const firstName = (user?.fullname || "").split(" ")[0];

  // Clients only ever see their own reviews, so they get a single lane.
  const lanes = isCustomer
    ? [
        {
          ...LANES[1],
          title: "My Reviews",
          icon: "Star",
          emptyText: "No reviews yet.",
        },
      ]
    : LANES;

  const centerTop = (
    <>
      {canCreate && (
        <div className={`glass-card ${styles.composer}`}>
          <CustomAvatarStack
            items={[
              { id: me.id, name: me.fullname, image: me.image || undefined },
            ]}
            limit={1}
            size={40}
          />
          <button
            type="button"
            className={styles.composerInput}
            onClick={openComposer}
          >
            {isCustomer
              ? `Write a review, ${firstName}...`
              : `Give a shoutout, ${firstName}...`}
          </button>
          <CustomButton
            variant="gradient"
            icon={<CustomIcon name="Megaphone" size={18} />}
            onClick={openComposer}
          >
            Post
          </CustomButton>
        </div>
      )}

      {pinnedId && (
        <>
          <div className={styles.pinnedBar}>
            <span>
              <CustomIcon name="Pin" size={12} /> Opened from a notification
            </span>
            <button
              type="button"
              className={styles.linkBtn}
              onClick={() => setSearchParams({})}
            >
              Dismiss
            </button>
          </div>
          {pinned.data ? (
            <FeedPostCard post={pinned.data} highlighted {...cardProps} />
          ) : pinned.isError ? (
            <div className={`glass-card ${styles.empty}`}>
              This {entityName.toLowerCase()} is no longer available.
            </div>
          ) : null}
        </>
      )}
    </>
  );

  return (
    <>
      <StandardListLayout
        header={
          <div className={styles.header}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>
                {entityNamePlural}
              </h1>
              <p style={{ color: "var(--text-muted)" }}>
                {isCustomer
                  ? "Your reviews and feedback"
                  : "Celebrate wins, share news and cheer your colleagues on"}
              </p>
            </div>
            <CustomInput
              placeholder={`Search ${entityNamePlural.toLowerCase()}...`}
              value={searchInput}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setSearchInput(e.target.value);
                if (e.target.value === "") setSearch("");
              }}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === "Enter") setSearch(searchInput.trim());
              }}
              icon={<CustomIcon name="Search" size={18} />}
              containerStyle={{ width: "min(320px, 100%)" }}
            />
          </div>
        }
      >
        {lanes.length > 1 && (
          <div className={styles.laneTabs}>
            {lanes.map((lane) => (
              <button
                key={lane.id}
                type="button"
                className={`${styles.laneTab} ${
                  activeLane === lane.id ? styles.laneTabActive : ""
                }`}
                onClick={() => setActiveLane(lane.id)}
              >
                <CustomIcon name={lane.icon} size={14} />
                {lane.title}
              </button>
            ))}
          </div>
        )}

        <div
          className={`${styles.board} ${lanes.length === 1 ? styles.boardSingle : ""}`}
        >
          {lanes.map((lane) => (
            <FeedColumn
              key={lane.id}
              id={lane.id}
              title={lane.title}
              icon={lane.icon}
              accent={lane.accent}
              filter={lane.filter}
              emptyText={lane.emptyText}
              search={search}
              hideId={pinnedId}
              active={lanes.length === 1 || activeLane === lane.id}
              scrollRef={lane.id === "feed" ? scrollRef : undefined}
              cardProps={cardProps}
              top={lane.id === "feed" ? centerTop : undefined}
            />
          ))}
        </div>
      </StandardListLayout>

      <AnnouncementModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPost(null);
        }}
        announcement={editingPost}
        onSubmit={async (data) => saveMutation.mutate(data)}
        isLoading={saveMutation.isPending}
      />

      <ConfirmationModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={() => postToDelete && deleteMutation.mutate(postToDelete)}
        title={`Delete ${entityName}`}
        message={`Are you sure you want to delete this ${entityName.toLowerCase()}? Its reactions and comments will be removed from the feed too.`}
        confirmText="Delete"
        type="danger"
      />
    </>
  );
};

export default AnnouncementFeed;
