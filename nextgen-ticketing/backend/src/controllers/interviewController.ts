import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { InterviewStatus } from "../utils/constants";
import { startOfDay, endOfDay } from "date-fns";
import { io } from "../index";
import { emitNotificationToUser } from "../socketio/events";
import { RoleName, StatusName, PriorityName, TicketType, ActionName } from "../utils/constants";

const prisma = new PrismaClient();

// Get all interviews with filters
export const getAllInterviews = async (req: AuthRequest, res: Response) => {
  const { filter, startDate, endDate, candidateId } = req.query;

  try {
    const where: any = {};
    const now = new Date();

    // Permission check: Employees/Agents only see their own interviews
    if (req.user?.role !== RoleName.ADMIN && req.user?.role !== RoleName.HR) {
      where.panelMembers = {
        some: {
          userId: req.user?.id
        }
      };
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
      default:
        // "all" or undefined — no status/date filter
        break;
    }

    // Date range override
    if (startDate && endDate) {
      where.scheduledAt = {
        gte: new Date(startDate as string),
        lte: endOfDay(new Date(endDate as string)),
      };
    }

    if (candidateId) {
      where.candidateId = candidateId as string;
    }

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        candidate: { select: { id: true, name: true, email: true, position: true } },
        scheduledBy: { select: { id: true, fullname: true } },
        panelMembers: {
          include: {
            user: { select: { id: true, fullname: true, image: true, role: { select: { name: true } } } },
          },
        },
        _count: { select: { feedbacks: true } },
      },
      orderBy: { scheduledAt: "desc" },
    });

    res.json({ success: true, interviews });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single interview with full details
export const getInterviewById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const interview = await prisma.interview.findUnique({
      where: { id: id as string },
      include: {
        candidate: true,
        scheduledBy: { select: { id: true, fullname: true, image: true } },
        panelMembers: {
          include: {
            user: { select: { id: true, fullname: true, image: true, email: true, role: { select: { name: true } } } },
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

    if (!interview) {
      return res.status(404).json({ success: false, error: "Interview not found" });
    }

    // Permission check: Employees/Agents only see their own interviews
    if (req.user?.role !== RoleName.ADMIN && req.user?.role !== RoleName.HR) {
      const isPanelMember = interview.panelMembers.some(pm => pm.userId === req.user?.id);
      if (!isPanelMember) {
        return res.status(403).json({ success: false, error: "Access denied. You are not a panel member." });
      }
    }

    res.json({ success: true, interview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Schedule a new interview
export const createInterview = async (req: AuthRequest, res: Response) => {
  const { title, scheduledAt, duration, location, notes, candidateId, interviewerIds } = req.body;
  const scheduledById = req.user?.id;

  if (!scheduledById) return res.status(401).json({ message: "Unauthorized" });

  try {
    const interview = await prisma.$transaction(async (tx) => {
      // 1. Create the interview
      const created = await tx.interview.create({
        data: {
          title,
          scheduledAt: new Date(scheduledAt),
          duration: duration || 60,
          location: location || null,
          notes: notes || null,
          candidateId,
          scheduledById,
        },
      });

      // 2. Create panel members
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

    // Fetch the full interview
    const fullInterview = await prisma.interview.findUnique({
      where: { id: interview.id },
      include: {
        candidate: { select: { id: true, name: true, email: true, position: true } },
        scheduledBy: { select: { id: true, fullname: true } },
        panelMembers: {
          include: {
            user: { select: { id: true, fullname: true, image: true } },
          },
        },
      },
    });

    res.status(201).json({ success: true, interview: fullInterview });

    // --- Generate Notifications ---
    try {
      const notifyUserIds = new Set<string>();

      // 1. Add all Panel Members
      if (interviewerIds && Array.isArray(interviewerIds)) {
        interviewerIds.forEach((id: string) => notifyUserIds.add(id));
      }

      // 2. Add all Admins
      const admins = await prisma.user.findMany({
        where: {
          role: { name: RoleName.ADMIN },
          deleted: false
        },
        select: { id: true }
      });
      admins.forEach(admin => notifyUserIds.add(admin.id));

      // 3. Create and emit notifications
      if (fullInterview) {
        for (const targetUserId of notifyUserIds) {
          const notification = await prisma.notification.create({
            data: {
              title: "Interview Scheduled",
              message: `Interview "${fullInterview.title}" scheduled for ${fullInterview.candidate.name}`,
              type: "interview",
              userId: targetUserId,
              data: { 
                interviewId: fullInterview.id, 
                candidateId: fullInterview.candidate.id 
              },
            },
          });
          emitNotificationToUser(io, targetUserId, notification);
        }
      }
    } catch (notifError) {
      console.error("Failed to generate interview notifications:", notifError);
    }

    // --- Create Tickets for Panel Members ---
    try {
      if (fullInterview && interviewerIds && Array.isArray(interviewerIds) && interviewerIds.length > 0) {
        const status = await prisma.status.findUnique({ where: { name: StatusName.NEW } });
        const priority = await prisma.priority.findUnique({ where: { name: PriorityName.NORMAL } });
        const type = await prisma.type.findUnique({ where: { name: TicketType.TASK } });
        
        for (const interviewerId of interviewerIds) {
          const count = await prisma.ticket.count();
          const uid = count + 1000;
          
          const ticket = await prisma.ticket.create({
            data: {
              uid,
              subject: `Interview: ${fullInterview.title}`,
              issue: `You have been assigned to the panel for interview "${fullInterview.title}" with candidate ${fullInterview.candidate.name}.\n\nScheduled At: ${new Date(fullInterview.scheduledAt).toLocaleString()}\nDuration: ${fullInterview.duration} mins\nLocation: ${fullInterview.location || "N/A"}`,
              status: { connect: { id: status?.id } },
              priority: { connect: { id: priority?.id } },
              type: { connect: { id: type?.id } },
              owner: { connect: { id: scheduledById } },
              assignee: { connect: { id: interviewerId } },
              history: {
                create: {
                  action: ActionName.TICKET_CREATED,
                  description: "Ticket automatically created for interview panel member",
                  actorId: scheduledById,
                },
              },
            }
          });

          // Notify socket clients to refresh boards
          io.emit("ticket:updated", { ticketId: ticket.id });
        }
      }
    } catch (ticketError) {
      console.error("Failed to create tickets for panel members:", ticketError);
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update interview
export const updateInterview = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { title, scheduledAt, duration, location, notes, candidateId, interviewerIds } = req.body;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update interview details
      await tx.interview.update({
        where: { id: id as string },
        data: {
          title,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
          duration,
          location,
          notes,
          candidateId,
        },
      });

      // 2. Update panel if interviewerIds provided
      if (interviewerIds) {
        await tx.interviewPanel.deleteMany({ where: { interviewId: id as string } });
        if (interviewerIds.length > 0) {
          await tx.interviewPanel.createMany({
            data: interviewerIds.map((userId: string) => ({
              interviewId: id as string,
              userId,
            })),
          });
        }
      }
    });

    const fullInterview = await prisma.interview.findUnique({
      where: { id: id as string },
      include: {
        candidate: { select: { id: true, name: true, email: true, position: true } },
        scheduledBy: { select: { id: true, fullname: true } },
        panelMembers: {
          include: {
            user: { select: { id: true, fullname: true, image: true } },
          },
        },
        _count: { select: { feedbacks: true } },
      },
    });

    res.json({ success: true, interview: fullInterview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update interview status
export const updateInterviewStatus = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const interview = await prisma.interview.update({
      where: { id: id as string },
      data: { status },
    });

    res.json({ success: true, interview });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete interview
export const deleteInterview = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.interview.delete({ where: { id: id as string } });
    res.json({ success: true, message: "Interview deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Submit feedback
export const submitFeedback = async (req: AuthRequest, res: Response) => {
  const { id } = req.params; // interview id
  const interviewerId = req.user?.id;
  const { communicationRating, technicalRating, leadershipRating, comments, recommendation } = req.body;

  if (!interviewerId) return res.status(401).json({ message: "Unauthorized" });

  try {
    // Verify the user is a panel member
    const panelMember = await prisma.interviewPanel.findUnique({
      where: {
        interviewId_userId: {
          interviewId: id as string,
          userId: interviewerId,
        },
      },
    });

    if (!panelMember) {
      return res.status(403).json({
        success: false,
        error: "You are not a panel member for this interview",
      });
    }

    const overallRating =
      (communicationRating + technicalRating + leadershipRating) / 3;

    const feedback = await prisma.interviewFeedback.upsert({
      where: {
        interviewId_interviewerId: {
          interviewId: id as string,
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
        interviewId: id as string,
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

    res.json({ success: true, feedback });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
