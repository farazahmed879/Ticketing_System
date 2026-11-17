import { AnnouncementType } from "../../../utils/constants";

export interface FeedUser {
  id: string;
  fullname: string;
  image?: string | null;
}

export interface FeedComment {
  id: string;
  content: string;
  createdAt: string;
  user: FeedUser;
}

export interface FeedPost {
  id: string;
  title: string;
  description: string;
  date: string;
  type: string;
  shouldPopout?: boolean;
  isProjectTeamOnly?: boolean;
  /** Base64 data URLs: images and documents. */
  attachments?: string[];
  createdAt: string;
  authorId: string;
  author: FeedUser & {
    title?: string | null;
    role?: { name: string; roleType: string } | null;
  };
  project?: { id: string; name: string } | null;
  reactionCounts: Record<string, number>;
  reactionTotal: number;
  myReaction: string | null;
  reactors: { id: string; fullname: string; type: string }[];
  commentCount: number;
  recentComments: FeedComment[];
}

/** Order here = order in the reaction picker. Keys match the backend. */
export const REACTIONS = [
  { type: "like", emoji: "👍", label: "Like", color: "#3b82f6" },
  { type: "love", emoji: "❤️", label: "Love", color: "#ef4444" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate", color: "#f59e0b" },
  { type: "clap", emoji: "👏", label: "Applause", color: "#10b981" },
  { type: "haha", emoji: "😂", label: "Haha", color: "#f59e0b" },
  { type: "wow", emoji: "😮", label: "Wow", color: "#f59e0b" },
] as const;

export const getReaction = (type?: string | null) =>
  REACTIONS.find((r) => r.type === type);

/** Badge colour + icon per shoutout type. */
export const POST_TYPE_STYLE: Record<
  string,
  { variant: "info" | "danger" | "success" | "warning" | "primary" | "neutral"; icon: string; label: string }
> = {
  [AnnouncementType.EVENT]: { variant: "info", icon: "Calendar", label: "Event" },
  [AnnouncementType.IMPORTANT]: { variant: "danger", icon: "AlertTriangle", label: "Important" },
  [AnnouncementType.REVIEW]: { variant: "success", icon: "Star", label: "Review" },
  [AnnouncementType.INFO]: { variant: "warning", icon: "Info", label: "Info" },
  [AnnouncementType.MOMENT]: { variant: "primary", icon: "Award", label: "Moment" },
};
