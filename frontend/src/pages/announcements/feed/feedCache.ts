import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import type { FeedPost } from "./feedTypes";

export const FEED_KEY = "announcementFeed";
export const FEED_POST_KEY = "announcementFeedPost";
export const COMMENTS_KEY = "announcementComments";

export interface FeedPage {
  posts: FeedPost[];
  pagination: { total: number; page: number; limit: number; hasMore: boolean };
}

/** Apply `update` to post `id` everywhere it is cached (feed pages + single post). */
export function patchPost(
  qc: QueryClient,
  id: string,
  update: (post: FeedPost) => FeedPost,
) {
  qc.setQueriesData<InfiniteData<FeedPage>>({ queryKey: [FEED_KEY] }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            posts: page.posts.map((p) => (p.id === id ? update(p) : p)),
          })),
        }
      : data,
  );
  qc.setQueryData<FeedPost>([FEED_POST_KEY, id], (p) => (p ? update(p) : p));
}

/** Re-fetch one post from the server and patch it into the caches. */
export async function refreshPost(qc: QueryClient, id: string) {
  try {
    const res = await api.get(API_ROUTES.ANNOUNCEMENTS.FEED_POST(id));
    const fresh: FeedPost = res.data.post;
    patchPost(qc, id, () => fresh);
  } catch {
    // Post deleted or no longer visible: fall back to a full refresh.
    qc.invalidateQueries({ queryKey: [FEED_KEY] });
  }
  qc.invalidateQueries({ queryKey: [COMMENTS_KEY, id] });
}

/** Local (optimistic) version of a reaction change. */
export function applyReaction(
  post: FeedPost,
  type: string | null,
  me: { id: string; fullname: string },
): FeedPost {
  const counts = { ...post.reactionCounts };
  if (post.myReaction) {
    counts[post.myReaction] = Math.max((counts[post.myReaction] || 1) - 1, 0);
    if (!counts[post.myReaction]) delete counts[post.myReaction];
  }
  if (type) counts[type] = (counts[type] || 0) + 1;

  const others = post.reactors.filter((r) => r.id !== me.id);
  return {
    ...post,
    myReaction: type,
    reactionCounts: counts,
    reactionTotal: post.reactionTotal + (type ? 1 : 0) - (post.myReaction ? 1 : 0),
    reactors: type ? [{ id: me.id, fullname: me.fullname, type }, ...others] : others,
  };
}
