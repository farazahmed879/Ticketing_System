import { interviewRepository } from "../repositories/interview.repository";
import { ticketRepository } from "../repositories/ticket.repository";
import prisma from "../prisma";
import {
  InterviewStatus,
  RoleName,
  StatusName,
  PriorityName,
  TicketType,
  ActionName,
  TICKET_STATUSES,
  PRIORITIES,
} from "../utils/constants";
import { startOfDay, endOfDay } from "date-fns";

export const interviewUsecase = {
  async getAllInterviews(filters: any, user: any) {
    const { filter, startDate, endDate, candidateId, limit, page } = filters;
    const where: any = {};
    const now = new Date();

    const take = limit ? parseInt(limit as string) : undefined;
    const skip = page && take ? parseInt(page as string) * take : undefined;

    if (user.role !== RoleName.ADMIN && user.role !== RoleName.HR) {
      where.panelMembers = { some: { userId: user.id } };
    }

    switch (filter) {
      case "upcoming":
        where.scheduledAt = { gt: now };
        where.status = InterviewStatus.SCHEDULED;
        break;
      case "today":
        where.scheduledAt = {
          gte: startOfDay(now),
          lte: endOfDay(now),
        };
        break;
      case "completed":
        where.status = InterviewStatus.COMPLETED;
        break;
      case "cancelled":
        where.status = InterviewStatus.CANCELLED;
        break;
    }

    if (startDate && endDate) {
      where.scheduledAt = {
        gte: new Date(startDate as string),
        lte: endOfDay(new Date(endDate as string)),
      };
    }

    if (candidateId) {
      where.candidateId = candidateId as string;
    }

    const [interviews, total] = await Promise.all([
      interviewRepository.findMany(where, skip, take),
      interviewRepository.count(where),
    ]);

    return { interviews, total };
  },

  async getInterviewById(id: string, user: any) {
    const interview = (await interviewRepository.findById(id)) as any;
    if (!interview) throw new Error("Interview not found");

    if (user.role !== RoleName.ADMIN && user.role !== RoleName.HR) {
      const isPanelMember = interview.panelMembers.some(
        (pm: any) => pm.userId === user.id
      );
      if (!isPanelMember)
        throw new Error("Access denied. You are not a panel member.");
    }

    return interview;
  },

  async createInterview(data: any, user: any) {
    const { interviewerIds } = data;
    const interview = await interviewRepository.createInterviewWithPanel(
      { ...data, scheduledById: user.id },
      interviewerIds
    );

    const fullInterview = await interviewRepository.findById(interview.id);
    if (!fullInterview) throw new Error("Failed to create interview");

    const notifications = [];
    const notifyUserIds = new Set<string>();

    if (interviewerIds && Array.isArray(interviewerIds)) {
      interviewerIds.forEach((id: string) => notifyUserIds.add(id));
    }

    const admins = await interviewRepository.findAdmins();
    admins.forEach((admin) => notifyUserIds.add(admin.id));

    for (const targetUserId of notifyUserIds) {
      const notification = await ticketRepository.createNotification({
        title: "Interview Scheduled",
        message: `Interview "${(fullInterview as any).title}" scheduled for ${(fullInterview as any).candidate.name}`,
        type: "interview",
        userId: targetUserId,
        data: {
          interviewId: (fullInterview as any).id,
          candidateId: (fullInterview as any).candidate.id,
        },
      });
      notifications.push({ userId: targetUserId, notification });
    }

    // Create tickets for panel members
    if (interviewerIds && Array.isArray(interviewerIds)) {
      await this.createTicketsForInterview(
        fullInterview,
        interviewerIds,
        user.id
      );
    }

    return { interview: fullInterview, notifications };
  },

  async updateInterview(id: string, data: any, user: any) {
    const { interviewerIds, scheduledAt } = data;
    const notifications: any[] = [];
    let toAddTickets: string[] = [];

    const interview = await interviewRepository.updateInterviewWithPanel(
      id,
      data,
      interviewerIds
    );

    if (scheduledAt) {
      await (prisma as any).ticket.updateMany({
        where: { interviewId: id },
        data: { dueDate: new Date(scheduledAt) },
      });
    }

    if (interviewerIds) {
      const existingTickets = await (prisma as any).ticket.findMany({
        where: { interviewId: id, deleted: false },
      });

      const currentTicketUserIds = existingTickets
        .map((t: any) => t.assigneeId)
        .filter(Boolean) as string[];

      toAddTickets = interviewerIds.filter(
        (uid: string) => !currentTicketUserIds.includes(uid)
      );
      const toRemoveTickets = currentTicketUserIds.filter(
        (uid: string) => !interviewerIds.includes(uid)
      );

      if (toRemoveTickets.length > 0) {
        await (prisma as any).ticket.deleteMany({
          where: {
            interviewId: id,
            assigneeId: { in: toRemoveTickets },
          },
        });
      }

      if (toAddTickets.length > 0) {
        const fullInterview = await interviewRepository.findById(id);
        if (fullInterview) {
          await this.createTicketsForInterview(
            fullInterview,
            toAddTickets,
            user.id
          );
        }
      }

      if (data.title || data.candidateId) {
        const fullInterview = (await interviewRepository.findById(id)) as any;
        if (fullInterview) {
          const subject = `Interview: ${fullInterview.candidate.name} - ${
            fullInterview.title || "Technical Round"
          }`;
          await (prisma as any).ticket.updateMany({
            where: {
              interviewId: id,
              assigneeId: {
                in: interviewerIds.filter((uid: string) => !toAddTickets.includes(uid)),
              },
            },
            data: {
              subject,
              issue: `Updated: You are part of the interview panel. Date: ${new Date(
                fullInterview.scheduledAt
              ).toLocaleString()}`,
            },
          });
        }
      }

      const fullInterview = (await interviewRepository.findById(id)) as any;
      if (!fullInterview) throw new Error("Failed to update interview");

      if (toAddTickets.length > 0) {
        for (const targetUserId of toAddTickets) {
          const notification = await ticketRepository.createNotification({
            title: "Added to Interview Panel",
            message: `You have been added to the panel for interview "${fullInterview.title}" with candidate ${fullInterview.candidate.name}`,
            type: "interview",
            userId: targetUserId,
            data: {
              interviewId: fullInterview.id,
              candidateId: fullInterview.candidate.id,
            },
          });
          notifications.push({ userId: targetUserId, notification });
        }
      }
    }

    const fullInterview = await interviewRepository.findById(id);
    if (!fullInterview) throw new Error("Failed to update interview");

    return { interview: fullInterview, notifications };
  },

  async updateInterviewStatus(id: string, status: string) {
    return interviewRepository.updateStatus(id, status);
  },

  async deleteInterview(id: string) {
    return interviewRepository.deleteInterview(id);
  },

  async submitFeedback(id: string, data: any, user: any) {
    const interviewerId = user.id;
    const {
      communicationRating,
      technicalRating,
      leadershipRating,
      comments,
      recommendation,
    } = data;

    const panelMember = await (prisma as any).interviewPanel.findUnique({
      where: {
        interviewId_userId: {
          interviewId: id,
          userId: interviewerId,
        },
      },
    });

    if (!panelMember) {
      throw new Error("You are not a panel member for this interview");
    }

    const overallRating =
      (communicationRating + technicalRating + leadershipRating) / 3;

    return (prisma as any).interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId: id,
          interviewerId,
        },
      },
      update: {
        communicationRating,
        technicalRating,
        leadershipRating,
        overallRating: Math.round(overallRating * 10) / 10,
        comments: comments || null,
        recommendation: recommendation || "Neutral",
      },
      create: {
        interviewId: id,
        interviewerId,
        communicationRating,
        technicalRating,
        leadershipRating,
        overallRating: Math.round(overallRating * 10) / 10,
        comments: comments || null,
        recommendation: recommendation || "Neutral",
      },
      include: {
        interviewer: { select: { id: true, fullname: true, image: true } },
      },
    });
  },

  async createTicketsForInterview(
    interview: any,
    interviewerIds: string[],
    creatorId: string
  ) {
    const status = TICKET_STATUSES.find(s => s.name === StatusName.NEW);
    const priority = PRIORITIES.find(p => p.name === PriorityName.NORMAL);
    const type = await ticketRepository.findTypeByName(TicketType.TASK);

    if (!status || !priority || !type) {
      console.error(
        "Required Ticket configuration (Status/Priority/Type) not found."
      );
      return;
    }

    for (const interviewerId of interviewerIds) {
      const count = await ticketRepository.count({});
      const uid = count + 1000;

      await (prisma as any).ticket.create({
        data: {
          uid,
          subject: `Interview: ${interview.title}`,
          issue: `You have been assigned to the panel for interview "${
            interview.title
          }" with candidate ${
            interview.candidate.name
          }.\n\nScheduled At: ${new Date(
            interview.scheduledAt
          ).toLocaleString()}\nDuration: ${
            interview.duration
          } mins\nLocation: ${interview.location || "N/A"}`,
          statusId: status.id,
          priorityId: priority.id,
          type: { connect: { id: type.id } },
          owner: { connect: { id: creatorId } },
          assignee: { connect: { id: interviewerId } },
          dueDate: new Date(interview.scheduledAt),
          interview: { connect: { id: interview.id } },
          history: {
            create: {
              action: ActionName.TICKET_CREATED,
              description:
                "Ticket automatically created for interview panel member",
              actorId: creatorId,
            },
          },
        },
      });
    }
  },
};
