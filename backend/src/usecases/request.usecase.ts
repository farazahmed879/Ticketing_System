import { requestRepository } from "../repositories/request.repository";
import { userRepository } from "../repositories/user.repository";
import prisma from "../prisma";

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

  /** Whether `leadId` is the team lead of a (non-deleted) team `memberId` belongs to. */
  async isTeamLeadOfMember(leadId: string, memberId: string): Promise<boolean> {
    const team = await prisma.team.findFirst({
      where: {
        teamLeadId: leadId,
        memberIds: { has: memberId },
        deleted: false,
      },
      select: { id: true },
    });
    return !!team;
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
        message: `${creator?.fullname || "A user"} has submitted a ${data.type.toLowerCase().replace("_", " ")} request.`,
        type: "request",
        userId: targetId,
        data: { requestId: request.id },
      });
      notifications.push({ userId: targetId, notification });
    }

    return { request, notifications };
  },

  async updateRequestStatus(id: string, status: string, message: string) {
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

    const request = await requestRepository.update(id, {
      status,
      message,
      updatedAt: new Date(),
    });

    let notification = null;
    if (request.userId) {
      notification = await requestRepository.createNotification({
        title: `Request ${status}`,
        message: `Your ${request.type
          .toLowerCase()
          .replace("_", " ")} request has been ${status.toLowerCase()}. ${
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
