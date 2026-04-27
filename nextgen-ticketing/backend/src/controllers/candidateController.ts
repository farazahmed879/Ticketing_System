import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { AuthRequest } from "../middleware/auth";
import { uploadToGoogleDrive } from "../services/googleDriveService";

const prisma = new PrismaClient();

// Get all candidates with optional search & status filter
export const getAllCandidates = async (req: AuthRequest, res: Response) => {
  const { search, status } = req.query;

  try {
    const where: any = {};

    if (status && status !== "all") {
      where.status = status as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: "insensitive" } },
        { email: { contains: search as string, mode: "insensitive" } },
        { position: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        _count: { select: { interviews: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, candidates });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get single candidate with interview history
export const getCandidateById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const candidate = await prisma.candidate.findUnique({
      where: { id: id as string },
      include: {
        interviews: {
          include: {
            scheduledBy: { select: { id: true, fullname: true } },
            panelMembers: {
              include: {
                user: { select: { id: true, fullname: true, image: true } },
              },
            },
            _count: { select: { feedbacks: true } },
          },
          orderBy: { scheduledAt: "desc" },
        },
      },
    });

    if (!candidate) {
      return res.status(404).json({ success: false, error: "Candidate not found" });
    }

    res.json({ success: true, candidate });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Create candidate
export const createCandidate = async (req: AuthRequest, res: Response) => {
  const { name, email, phone, position, resumeUrl, notes, status, objective, technicalSkills, workExperience, cnic, address, linkedin, portfolio, github, projects } = req.body;

  try {
    const candidate = await prisma.candidate.create({
      data: {
        name,
        email,
        phone: phone || null,
        cnic: cnic || null,
        address: address || null,
        position,
        resumeUrl: resumeUrl || null,
        notes: notes || null,
        objective: objective || null,
        technicalSkills: technicalSkills || null,
        workExperience: workExperience || null,
        linkedin: linkedin || null,
        portfolio: portfolio || null,
        github: github || null,
        projects: projects || null,
        status: status || "Active",
      },
    });

    res.status(201).json({ success: true, candidate });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, error: "A candidate with this email already exists" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update candidate
export const updateCandidate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { name, email, phone, position, resumeUrl, notes, status, objective, technicalSkills, workExperience, cnic, address, linkedin, portfolio, github, projects } = req.body;

  try {
    const candidate = await prisma.candidate.update({
      where: { id: id as string },
      data: {
        name,
        email,
        phone: phone || null,
        cnic: cnic || null,
        address: address || null,
        position,
        resumeUrl: resumeUrl || null,
        notes: notes || null,
        objective: objective || null,
        technicalSkills: technicalSkills || null,
        workExperience: workExperience || null,
        linkedin: linkedin || null,
        portfolio: portfolio || null,
        github: github || null,
        projects: projects || null,
        status,
      },
    });

    res.json({ success: true, candidate });
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ success: false, error: "A candidate with this email already exists" });
    }
    res.status(500).json({ success: false, error: error.message });
  }
};

// Delete candidate
export const deleteCandidate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.candidate.delete({ where: { id: id as string } });
    res.json({ success: true, message: "Candidate deleted successfully" });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Upload resume to Google Drive and return URL
export const uploadResume = async (req: AuthRequest, res: Response) => {
  try {
    const file = (req as any).file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: "Invalid file type. Only PDF and DOCX files are allowed.",
      });
    }

    const driveUrl = await uploadToGoogleDrive(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    if (!driveUrl) {
      return res.status(500).json({
        success: false,
        error: "Google Drive credentials not configured. Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID in your .env file.",
      });
    }

    res.json({ success: true, driveUrl });
  } catch (error: any) {
    console.error("Resume upload failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

