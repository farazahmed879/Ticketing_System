import React, { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import CustomIcon from "../../../components/CustomIcon";
import CustomButton from "../../../components/CustomButton";
import FeedPostCard from "./FeedPostCard";
import { FEED_KEY, type FeedPage } from "./feedCache";
import type { FeedPost } from "./feedTypes";
import api from "../../../services/api";
import { API_ROUTES } from "../../../utils/apiRoutes";
import styles from "./Feed.module.css";

const PAGE_SIZE = 10;

export interface FeedFilter {
  types?: string[];
  excludeTypes?: string[];
}

interface FeedColumnProps {
  /** Stable id, part of the query key. */
  id: string;
  title: string;
  icon: string;
  accent: string;
  filter: FeedFilter;
  search: string;
  /** Post already shown elsewhere (e.g. pinned) - hidden from this column. */
  hideId?: string | null;
  emptyText: string;
  /** Rendered above the posts (composer, pinned post...). */
  top?: React.ReactNode;
  active?: boolean;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  cardProps: Omit<React.ComponentProps<typeof FeedPostCard>, "post">;
}

/** One independently scrolling, infinitely loading lane of the shoutouts wall. */
const FeedColumn: React.FC<FeedColumnProps> = ({
  id,
  title,
  icon,
  accent,
  filter,
  search,
  hideId,
  emptyText,
  top,
  active,
  scrollRef,
  cardProps,
}) => {
  const ownScrollRef = useRef<HTMLDivElement>(null);
  const scroller = scrollRef || ownScrollRef;
  const sentinelRef = useRef<HTMLDivElement>(null);

  const feed = useInfiniteQuery({
    queryKey: [FEED_KEY, id, search],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get(API_ROUTES.ANNOUNCEMENTS.FEED, {
        params: {
          page: pageParam,
          limit: PAGE_SIZE,
          search: search || undefined,
          types: filter.types?.join(",") || undefined,
          excludeTypes: filter.excludeTypes?.join(",") || undefined,
        },
      });
      return res.data as FeedPage;
    },
    getNextPageParam: (last) =>
      last.pagination.hasMore ? last.pagination.page + 1 : undefined,
  });

  const posts: FeedPost[] = (feed.data?.pages.flatMap((p) => p.posts) || []).filter(
    (p) => p.id !== hideId,
  );
  const total = feed.data?.pages[0]?.pagination.total;

  // Infinite scroll: load the next page when the sentinel comes into view.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = feed;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { root: scroller.current, rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, scroller]);

  return (
    <section
      className={`${styles.lane} ${active ? styles.laneActive : ""}`}
    >
      <div className={styles.laneHeader}>
        <span className={styles.laneIcon} style={{ color: accent, background: `${accent}1a` }}>
          <CustomIcon name={icon} size={15} />
        </span>
        <span className={styles.laneTitle}>{title}</span>
        {total !== undefined && <span className={styles.laneCount}>{total}</span>}
      </div>

      <div ref={scroller} className={styles.scroll}>
        <div className={styles.column}>
          {top}

          {feed.isLoading ? (
            <div className={styles.empty}>Loading...</div>
          ) : feed.isError ? (
            <div className={styles.empty}>
              Couldn't load this section.
              <CustomButton variant="ghost" onClick={() => feed.refetch()}>
                Try again
              </CustomButton>
            </div>
          ) : posts.length === 0 ? (
            <div className={`glass-card ${styles.empty} ${styles.emptySmall}`}>
              <CustomIcon name={icon} size={28} />
              {search ? `Nothing matches "${search}".` : emptyText}
            </div>
          ) : (
            posts.map((post) => <FeedPostCard key={post.id} post={post} {...cardProps} />)
          )}

          <div ref={sentinelRef} />
          {isFetchingNextPage && <div className={styles.loadMore}>Loading more...</div>}
          {!hasNextPage && posts.length > PAGE_SIZE && (
            <div className={styles.loadMore}>You're all caught up 🎉</div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FeedColumn;
