import prisma from "../prisma";
import { InterviewStatus } from "../utils/constants";

export const interviewRepository = {
  async findMany(where: any, skip?: number, take?: number) {
    return prisma.interview.findMany({
      where: { ...where, deleted: false },
      include: {
        candidate: {
          select: { id: true, name: true, email: true, position: true },
        },
        scheduledBy: { select: { id: true, fullname: true } },
        panelMembers: {
          include: {
            user: {
              select: {
                id: true,
                fullname: true,
                image: true,
                role: { select: { name: true, roleType: true } },
              },
            },
          },
        },
        _count: { select: { feedbacks: true } },
      },
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });
  },

  async count(where: any) {
    return prisma.interview.count({ where: { ...where, deleted: false } });
  },

  async findById(id: string) {
    return prisma.interview.findFirst({
      where: { id, deleted: false },
      include: {
        candidate: true,
        scheduledBy: { select: { id: true, fullname: true, image: true } },
        panelMembers: {
          include: {
            user: {
              select: {
                id: true,
                fullname: true,
                image: true,
                email: true,
                role: { select: { name: true, roleType: true } },
              },
            },
          },
        },
        feedbacks: {
          include: {
            interviewer: { select: { id: true, fullname: true, image: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  },

  async createInterviewWithPanel(data: any, interviewerIds: string[]) {
    return prisma.$transaction(async (tx) => {
      const created = await tx.interview.create({
        data: {
          title: data.title,
          scheduledAt: new Date(data.scheduledAt),
          duration: data.duration || 60,
          location: data.location || null,
          notes: data.notes || null,
          candidateId: data.candidateId,
          scheduledById: data.scheduledById,
        },
      });

      if (interviewerIds && interviewerIds.length > 0) {
        await tx.interviewPanel.createMany({
          data: interviewerIds.map((userId: string) => ({
            interviewId: created.id,
            userId,
          })),
        });
      }

      return created;
    });
  },

  async updateInterviewWithPanel(
    id: string,
    data: any,
    interviewerIds?: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.interview.update({
        where: { id },
        data: {
          title: data.title,
          scheduledAt: data.scheduledAt
            ? new Date(data.scheduledAt)
            : undefined,
          duration: data.duration,
          location: data.location,
          notes: data.notes,
          status: data.status,
          candidateId: data.candidateId,
        },
      });

      if (interviewerIds !== undefined) {
        await tx.interviewPanel.deleteMany({ where: { interviewId: id } });
        if (interviewerIds.length > 0) {
          await tx.interviewPanel.createMany({
            data: interviewerIds.map((userId: string) => ({
              interviewId: id,
              userId,
            })),
          });
        }
      }

      return updated;
    });
  },

  async deleteInterview(id: string) {
    return prisma.interview.update({
      where: { id },
      data: { deleted: true },
    });
  },

  async createFeedback(data: any) {
    return prisma.interviewFeedback.create({ data });
  },

  async updateStatus(id: string, status: string) {
    return prisma.interview.update({
      where: { id },
      data: { status },
    });
  },

  async findAdmins() {
    return prisma.user.findMany({
      where: {
        role: { name: "Admin" },
        deleted: false,
      },
      select: { id: true },
    });
  },
};
