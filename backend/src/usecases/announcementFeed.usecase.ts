import prisma from "../prisma";
import { RoleType } from "../utils/constants";

/** Reactions a user can leave on a shoutout (one per user, like Facebook). */
export const REACTION_TYPES = [
  "like",
  "love",
  "celebrate",
  "clap",
  "haha",
  "wow",
] as const;
export type ReactionType = (typeof REACTION_TYPES)[number];

const MAX_COMMENT_LENGTH = 2000;
/** How many of the latest comments are sent with each feed post. */
const PREVIEW_COMMENTS = 2;

type FeedUser = { id: string; role: string; canDelete?: boolean };

const AUTHOR_SELECT = {
  id: true,
  fullname: true,
  image: true,
  title: true,
  role: { select: { name: true, roleType: true } },
};

const COMMENT_USER_SELECT = { id: true, fullname: true, image: true };

/**
 * Which shoutouts `user` can see on the wall:
 * - Admins / Managers: everything.
 * - Clients: only their own (reviews).
 * - Everyone else: all posts except "project team only" posts of projects
 *   they are not part of (their own posts are always visible).
 */
async function visibilityWhere(user: FeedUser): Promise<any> {
  if (user.role === RoleType.ADMIN || user.role === RoleType.AGENT) return {};
  if (user.role === RoleType.CUSTOMER) return { authorId: user.id };

  const userTeams = await prisma.team.findMany({
    where: { memberIds: { has: user.id }, deleted: false },
    select: { id: true, projectIds: true },
  });
  const directProjects = await prisma.project.findMany({
    where: {
      OR: [
        { teamIds: { hasSome: userTeams.map((t) => t.id) } },
        { managerId: user.id },
        { createdById: user.id },
      ],
      deleted: false,
    },
    select: { id: true },
  });
  const projectIds = Array.from(
    new Set([
      ...userTeams.flatMap((t) => t.projectIds || []),
      ...directProjects.map((p) => p.id),
    ]),
  );

  return {
    OR: [
      { isProjectTeamOnly: { not: true } },
      { projectId: null },
      { authorId: user.id },
      { projectId: { in: projectIds } },
    ],
  };
}

/** Adds reaction counts, the viewer's reaction and comment previews to posts. */
async function decorate(posts: any[], viewerId: string) {
  if (!posts.length) return [];
  const ids = posts.map((p) => p.id);

  const [reactions, comments] = await Promise.all([
    prisma.announcementReaction.findMany({
      where: { announcementId: { in: ids } },
      select: {
        type: true,
        announcementId: true,
        user: { select: { id: true, fullname: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.announcementComment.findMany({
      where: { announcementId: { in: ids }, deleted: false },
      select: {
        id: true,
        content: true,
        createdAt: true,
        announcementId: true,
        user: { select: COMMENT_USER_SELECT },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return posts.map((post) => {
    const postReactions = reactions.filter((r) => r.announcementId === post.id);
    const postComments = comments.filter((c) => c.announcementId === post.id);

    const reactionCounts: Record<string, number> = {};
    postReactions.forEach((r) => {
      reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
    });

    return {
      ...post,
      reactionCounts,
      reactionTotal: postReactions.length,
      myReaction:
        postReactions.find((r) => r.user.id === viewerId)?.type || null,
      // Names for the "who reacted" tooltip (most recent first).
      reactors: postReactions.slice(0, 15).map((r) => ({
        id: r.user.id,
        fullname: r.user.fullname,
        type: r.type,
      })),
      commentCount: postComments.length,
      recentComments: postComments
        .slice(-PREVIEW_COMMENTS)
        .map(({ announcementId: _a, ...c }) => c),
    };
  });
}

/** Loads a post the user is allowed to see, or throws a 404-style error. */
async function getVisiblePost(user: FeedUser, id: string) {
  const where = await visibilityWhere(user);
  const post = await prisma.announcement.findFirst({
    where: { AND: [{ id, deleted: false }, where] },
    include: {
      author: { select: AUTHOR_SELECT },
      project: { select: { id: true, name: true } },
    },
  });
  if (!post) throw Object.assign(new Error("Shoutout not found"), { status: 404 });
  return post;
}

/** Notification type for "a new shoutout was posted" (drives the sidebar badge). */
export const NEW_SHOUTOUT_NOTIFICATION = "shoutout_new";

/**
 * Everyone (except the author) who will see `post` on the wall - the inverse
 * of visibilityWhere(). Clients are left out: they only ever see their own
 * posts. Users whose role can't open the wall are left out too.
 */
async function audienceFor(post: {
  authorId: string;
  projectId: string | null;
  isProjectTeamOnly: boolean | null;
}): Promise<string[]> {
  const users = await prisma.user.findMany({
    where: { deleted: false, id: { not: post.authorId } },
    select: { id: true, role: { select: { roleType: true, permissions: true } } },
  });

  // "Project team only": restricted to the project's people (admins/managers always see it).
  let projectPeople: Set<string> | null = null;
  if (post.isProjectTeamOnly && post.projectId) {
    const project = await prisma.project.findUnique({
      where: { id: post.projectId },
      select: { managerId: true, createdById: true, teamIds: true },
    });
    const teams = await prisma.team.findMany({
      where: {
        deleted: false,
        OR: [{ id: { in: project?.teamIds || [] } }, { projectIds: { has: post.projectId } }],
      },
      select: { memberIds: true },
    });
    projectPeople = new Set(
      [
        ...teams.flatMap((t) => t.memberIds),
        project?.managerId,
        project?.createdById,
      ].filter((id): id is string => !!id),
    );
  }

  return users
    .filter((u) => {
      const roleType = u.role?.roleType;
      if (roleType === RoleType.CUSTOMER) return false;
      if (roleType === RoleType.ADMIN) return true;
      if ((u.role?.permissions as any)?.announcements?.view !== true) return false;
      if (roleType === RoleType.AGENT) return true;
      return !projectPeople || projectPeople.has(u.id);
    })
    .map((u) => u.id);
}

const NEW_POST_TITLES: Record<string, string> = {
  important: "Important announcement",
  event: "New event",
  info: "New info",
  review: "New review",
  moment: "New shoutout",
};

export const announcementFeedUsecase = {
  /**
   * Create a "new shoutout" notification for everyone who can see the post.
   * Returns the created notifications so the caller can push them live.
   */
  async notifyNewPost(post: {
    id: string;
    title: string;
    type: string;
    authorId: string;
    projectId: string | null;
    isProjectTeamOnly: boolean | null;
  }) {
    const [recipients, author] = await Promise.all([
      audienceFor(post),
      prisma.user.findUnique({ where: { id: post.authorId }, select: { fullname: true } }),
    ]);
    if (!recipients.length) return [];
    const title = NEW_POST_TITLES[post.type] || "New shoutout";
    const message = `${author?.fullname || "Someone"}: ${post.title}`;
    return prisma.$transaction(
      recipients.map((userId) =>
        prisma.notification.create({
          data: {
            title,
            message,
            type: NEW_SHOUTOUT_NOTIFICATION,
            userId,
            data: { announcementId: post.id, postType: post.type },
          },
        }),
      ),
    );
  },

  /** Unseen new shoutouts for the sidebar badge (ignores since-deleted/hidden posts). */
  async unreadCount(user: FeedUser) {
    const unread = await prisma.notification.findMany({
      where: { userId: user.id, type: NEW_SHOUTOUT_NOTIFICATION, unread: true },
      select: { data: true },
    });
    const ids = Array.from(
      new Set(
        unread
          .map((n) => (n.data as any)?.announcementId)
          .filter((id): id is string => typeof id === "string" && /^[a-f0-9]{24}$/i.test(id)),
      ),
    );
    if (!ids.length) return 0;
    const visibility = await visibilityWhere(user);
    return prisma.announcement.count({
      where: { AND: [{ id: { in: ids }, deleted: false }, visibility] },
    });
  },

  /** The user opened the wall: every "new shoutout" notification is now read. */
  async markAllSeen(user: FeedUser) {
    await prisma.notification.updateMany({
      where: { userId: user.id, type: NEW_SHOUTOUT_NOTIFICATION, unread: true },
      data: { unread: false },
    });
  },

  async getFeed(
    user: FeedUser,
    page: number,
    limit: number,
    search?: string,
    filter: { types?: string[]; excludeTypes?: string[] } = {},
  ) {
    const visibility = await visibilityWhere(user);
    const conditions: any[] = [{ deleted: false }, visibility];
    if (filter.types?.length) conditions.push({ type: { in: filter.types } });
    if (filter.excludeTypes?.length) {
      conditions.push({ type: { notIn: filter.excludeTypes } });
    }
    if (search) {
      conditions.push({
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    const where = { AND: conditions };

    const [posts, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        include: {
          author: { select: AUTHOR_SELECT },
          project: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      posts: await decorate(posts, user.id),
      pagination: {
        total,
        page,
        limit,
        hasMore: page * limit < total,
      },
    };
  },

  async getPost(user: FeedUser, id: string) {
    const post = await getVisiblePost(user, id);
    const [decorated] = await decorate([post], user.id);
    return decorated;
  },

  /**
   * Set (or replace) the viewer's reaction; `type: null` removes it.
   * Returns whether this is a brand-new reaction (used for notifications).
   */
  async setReaction(user: FeedUser, id: string, type: string | null) {
    const post = await getVisiblePost(user, id);

    if (type === null) {
      await prisma.announcementReaction.deleteMany({
        where: { announcementId: id, userId: user.id },
      });
      return { post, isNew: false };
    }

    if (!REACTION_TYPES.includes(type as ReactionType)) {
      throw Object.assign(
        new Error(`Invalid reaction. Allowed: ${REACTION_TYPES.join(", ")}.`),
        { status: 400 },
      );
    }

    const existing = await prisma.announcementReaction.findFirst({
      where: { announcementId: id, userId: user.id },
      select: { id: true },
    });
    if (existing) {
      await prisma.announcementReaction.update({
        where: { id: existing.id },
        data: { type },
      });
    } else {
      await prisma.announcementReaction.create({
        data: { type, announcementId: id, userId: user.id },
      });
    }
    return { post, isNew: !existing };
  },

  async listComments(user: FeedUser, id: string) {
    await getVisiblePost(user, id);
    return prisma.announcementComment.findMany({
      where: { announcementId: id, deleted: false },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: COMMENT_USER_SELECT },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async addComment(user: FeedUser, id: string, content: unknown) {
    const text = typeof content === "string" ? content.trim() : "";
    if (!text) {
      throw Object.assign(new Error("Comment cannot be empty."), { status: 400 });
    }
    if (text.length > MAX_COMMENT_LENGTH) {
      throw Object.assign(
        new Error(`Comment is too long (max ${MAX_COMMENT_LENGTH} characters).`),
        { status: 400 },
      );
    }
    const post = await getVisiblePost(user, id);
    const comment = await prisma.announcementComment.create({
      data: { content: text, announcementId: id, userId: user.id },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: COMMENT_USER_SELECT },
      },
    });
    return { post, comment };
  },

  /** Comment author, the post's author, Admins and Managers can delete a comment. */
  async deleteComment(user: FeedUser, postId: string, commentId: string) {
    const comment = await prisma.announcementComment.findFirst({
      where: { id: commentId, announcementId: postId, deleted: false },
      select: { id: true, userId: true, announcement: { select: { authorId: true } } },
    });
    if (!comment) {
      throw Object.assign(new Error("Comment not found"), { status: 404 });
    }
    const allowed =
      comment.userId === user.id ||
      comment.announcement.authorId === user.id ||
      // Moderation: Admin/Manager, unless delete-restricted (Sub Admin).
      (user.canDelete !== false &&
        (user.role === RoleType.ADMIN || user.role === RoleType.AGENT));
    if (!allowed) {
      throw Object.assign(new Error("You cannot delete this comment"), {
        status: 403,
      });
    }
    await prisma.announcementComment.update({
      where: { id: commentId },
      data: { deleted: true },
    });
  },
};
