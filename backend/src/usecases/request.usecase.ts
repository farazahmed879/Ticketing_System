import { requestRepository } from "../repositories/request.repository";
import { userRepository } from "../repositories/user.repository";
import prisma from "../prisma";
import { RoleType } from "../utils/constants";

export interface ReviewContext {
  ledMemberIds: Set<string>;
  orgManagersByMember: Map<string, Set<string>>;
}

const LEAVE_TYPES = new Set(["HALFDAY_LEAVE", "FULLDAY_LEAVE", "VACATION"]);

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function countWeekdays(startStr: string, endStr: string): number {
  const start = startOfDay(new Date(startStr));
  const end = startOfDay(new Date(endStr));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay(); // 0=Sun, 6=Sat
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function computeLeaveDays(
  type: string,
  startDate?: string,
  endDate?: string,
): number {
  if (type === "HALFDAY_LEAVE") return 0.5;
  if (type === "FULLDAY_LEAVE") {
    if (startDate && endDate && new Date(endDate) > new Date(startDate)) {
      return countWeekdays(startDate, endDate);
    }
    return 1;
  }
  if (type === "VACATION") {
    if (!startDate) return 0;
    return countWeekdays(startDate, endDate || startDate);
  }
  return 0;
}

export const requestUsecase = {
  async getRequests(userIds?: string | string[]) {
    const where: any = {};
    if (Array.isArray(userIds)) {
      where.userId = { in: userIds };
    } else if (userIds) {
      where.userId = userIds;
    }
    return requestRepository.findMany(where);
  },

  async getRequestById(id: string) {
    return requestRepository.findById(id);
  },

  /**
   * Member ids of every team the given user leads. Used to scope a team lead's
   * request list to their team members.
   */
  async getLedTeamMemberIds(userId: string): Promise<string[]> {
    const data = await userRepository.findUserWithTeams(userId);
    const ids = new Set<string>();
    (data?.ledTeams || []).forEach((team: any) => {
      (team.members || []).forEach((m: any) => ids.add(m.id));
    });
    return Array.from(ids);
  },

  /**
   * Everything needed to decide which requests `reviewerId` may approve or
   * reject: the members of teams they lead, and for every employee in an
   * organizational team, the manager(s) of those teams.
   */
  async getReviewContext(reviewerId: string): Promise<ReviewContext> {
    const [ledMemberIds, orgTeams] = await Promise.all([
      this.getLedTeamMemberIds(reviewerId),
      prisma.team.findMany({
        where: { deleted: false, teamType: "ORGANIZATIONAL" },
        select: { teamLeadId: true, memberIds: true },
      }),
    ]);
    const orgManagersByMember = new Map<string, Set<string>>();
    orgTeams.forEach((team) => {
      if (!team.teamLeadId) return;
      team.memberIds.forEach((memberId) => {
        if (!orgManagersByMember.has(memberId)) {
          orgManagersByMember.set(memberId, new Set());
        }
        orgManagersByMember.get(memberId)!.add(team.teamLeadId!);
      });
    });
    return { ledMemberIds: new Set(ledMemberIds), orgManagersByMember };
  },

  /**
   * Whether `reviewer` may approve/reject a request raised by `requesterId`.
   * - Admins can review anything.
   * - Nobody can review their own request.
   * - Employees in an organizational team: only that team's manager.
   * - Otherwise: any Manager, or the requester's team lead.
   */
  canReview(
    reviewer: { id: string; role: string },
    requesterId: string | null | undefined,
    ctx: ReviewContext,
  ): { allowed: boolean; reason?: string } {
    if (reviewer.role === RoleType.ADMIN) return { allowed: true };
    if (!requesterId) {
      return { allowed: false, reason: "Invalid request: No user associated" };
    }
    if (requesterId === reviewer.id) {
      return { allowed: false, reason: "You cannot approve your own request" };
    }

    // A manager's own request (they are a member of the team they manage)
    // falls through to the regular rules.
    const orgManagers = Array.from(
      ctx.orgManagersByMember.get(requesterId) || [],
    ).filter((id) => id !== requesterId);
    if (orgManagers.length > 0) {
      return orgManagers.includes(reviewer.id)
        ? { allowed: true }
        : {
            allowed: false,
            reason:
              "This employee belongs to an organizational team; only their manager can approve or reject this request",
          };
    }

    if (reviewer.role === RoleType.AGENT) return { allowed: true };
    if (ctx.ledMemberIds.has(requesterId)) return { allowed: true };
    return {
      allowed: false,
      reason: "You can only manage requests from your team members",
    };
  },

  async createRequest(data: {
    type: string;
    userId: string;
    message?: string;
    data?: any;
  }) {
    // Reject past-dated leave requests up-front.
    if (LEAVE_TYPES.has(data.type)) {
      const startStr: string | undefined = data.data?.startDate;
      if (startStr) {
        const start = startOfDay(new Date(startStr));
        const today = startOfDay(new Date());
        if (isNaN(start.getTime())) {
          throw new Error("Invalid start date.");
        }
        if (start < today) {
          throw new Error("Leave start date cannot be in the past.");
        }
        const endStr: string | undefined = data.data?.endDate;
        if (endStr) {
          const end = startOfDay(new Date(endStr));
          if (isNaN(end.getTime())) {
            throw new Error("Invalid end date.");
          }
          if (end < start) {
            throw new Error("Leave end date cannot be before start date.");
          }
        }

        // Block re-requesting leave for dates the manager already decided on.
        const end = startOfDay(new Date(endStr || startStr));
        const decided = await prisma.userRequest.findMany({
          where: {
            userId: data.userId,
            deleted: false,
            type: { in: Array.from(LEAVE_TYPES) },
            status: { in: ["APPROVED", "REJECTED"] },
          },
          select: { status: true, data: true },
        });
        const clash = decided.find((r) => {
          const d: any = r.data || {};
          if (!d.startDate) return false;
          const s = startOfDay(new Date(d.startDate));
          const e = startOfDay(new Date(d.endDate || d.startDate));
          if (isNaN(s.getTime()) || isNaN(e.getTime())) return false;
          return s <= end && start <= e; // date ranges overlap
        });
        if (clash) {
          const d: any = clash.data;
          const range =
            d.endDate && d.endDate !== d.startDate
              ? `${d.startDate} to ${d.endDate}`
              : d.startDate;
          throw new Error(
            `You already have a leave request for ${range} that was ${clash.status.toLowerCase()}. You cannot request leave for these dates again.`,
          );
        }
      }
    }

    const request = await requestRepository.create({
      type: data.type,
      userId: data.userId,
      message: data.message,
      data: data.data,
      status: "PENDING",
    });

    const notifications = [];
    const creator = await userRepository.findById(data.userId);
    const admins = await userRepository.findAdmins();

    const targetUserIds = new Set<string>();

    // 1. Add all Admins (they see everything)
    admins.forEach((admin) => {
      if (admin.id !== data.userId) targetUserIds.add(admin.id);
    });

    // Fetch all teams where this user is either a member or a manager
    const allTeams = await prisma.team.findMany({
      where: {
        OR: [
          {
            memberIds: {
              has: data.userId,
            },
          },
        ],
      },
      include: {
        members: {
          where: {
            deleted: false,
          },
          include: {
            role: true,
          },
        },
        // projects: {
        //   select: {
        //     id: true,
        //     fullname: true,
        //     email: true,
        //   },
        // },
      },
    });

    if (allTeams.length > 0) {
      allTeams.forEach((team: any) => {
        // 2. Add Team Lead
        if (team && team.teamLeadId !== data.userId) {
          targetUserIds.add(team.teamLeadId);
        }
      });
    }

    for (const targetId of targetUserIds) {
      const notification = await requestRepository.createNotification({
        title: "New Request Submitted",
        message: `${creator?.fullname || "A user"} has submitted a ${data.type.toLowerCase().replace(/_/g, " ")} request.`,
        type: "request",
        userId: targetId,
        data: { requestId: request.id },
      });
      notifications.push({ userId: targetId, notification });
    }

    return { request, notifications };
  },

  async updateRequestStatus(id: string, status: string, message?: string, approverId?: string) {
    const existing = await requestRepository.findById(id);
    if (!existing) throw new Error("Request not found.");
    const previousStatus = existing.status;

    // Adjust leave balance when status transitions involve a leave-type request.
    if (existing.userId && LEAVE_TYPES.has(existing.type)) {
      const data: any = existing.data || {};
      const days = computeLeaveDays(
        existing.type,
        data.startDate,
        data.endDate,
      );

      // Approving for the first time -> decrement balance (block if insufficient).
      if (status === "APPROVED" && previousStatus !== "APPROVED" && days > 0) {
        const user = await prisma.user.findUnique({
          where: { id: existing.userId },
          select: { leaves: true },
        });
        const currentBalance = user?.leaves ?? 0;
        if (currentBalance < days) {
          throw new Error(
            `Insufficient leave balance. Requested ${days} day(s), available ${currentBalance}.`,
          );
        }
        await prisma.user.update({
          where: { id: existing.userId },
          data: { leaves: { decrement: days } },
        });
      }

      // Un-approving a previously approved leave -> restore balance.
      if (previousStatus === "APPROVED" && status !== "APPROVED" && days > 0) {
        await prisma.user.update({
          where: { id: existing.userId },
          data: { leaves: { increment: days } },
        });
      }
    }

    const updatePayload: any = {
      status,
      message,
      updatedAt: new Date(),
    };
    if (status === "APPROVED" || status === "REJECTED") {
      if (approverId) {
        updatePayload.approvedById = approverId;
      }
    } else if (status === "PENDING") {
      updatePayload.approvedById = null;
    }

    const request = await requestRepository.update(id, updatePayload);

    let notification = null;
    if (request.userId) {
      notification = await requestRepository.createNotification({
        title: `Request ${status}`,
        message: `Your ${request.type
          .toLowerCase()
          .replace(/_/g, " ")} request has been ${status.toLowerCase()}. ${
          message || ""
        }`,
        type: "request",
        userId: request.userId,
        data: { requestId: request.id },
      });
    }

    return { request, notification };
  },

  async deleteRequest(id: string) {
    return requestRepository.delete(id);
  },
};
