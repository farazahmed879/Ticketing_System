import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { emitNotificationToUser } from "../socketio/events";
import { RoleName, LoginHelpType } from "../utils/constants";

const prisma = new PrismaClient();

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("Login attempt for:", email);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      console.log("User not found:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      console.log("Password mismatch for:", email);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );

    console.log("Login successful for:", email);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: {
          name: user.role.name,
          permissions: user.role.permissions,
        },
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res
      .status(500)
      .json({
        message: "Server error",
        error: error instanceof Error ? error.message : String(error),
      });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { role: true },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      title: user.title,
      role: {
        name: user.role.name,
        permissions: user.role.permissions,
      },
    });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const register = async (req: Request, res: Response) => {
  const { email, password, fullname } = req.body;
  console.log("Registering user:", email);

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Find customer role
    let role = await prisma.role.findUnique({ where: { name: RoleName.CUSTOMER } });
    if (!role) {
      console.log('Role "Customer" not found, creating fallback...');
      // Fallback if roles aren't seeded
      role = await prisma.role.create({
        data: {
          name: RoleName.CUSTOMER,
          description: "Default customer role",
          permissions: { tickets: { view: true, create: true } },
        },
      });
    }

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullname,
        roleId: role.id,
      },
      include: { role: true },
    });

    const token = jwt.sign(
      { id: user.id, role: user.role.name },
      process.env.JWT_SECRET as string,
      { expiresIn: "1d" },
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        role: {
          name: user.role.name,
          permissions: user.role.permissions,
        },
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res
      .status(500)
      .json({
        message: "Server error",
        error: error instanceof Error ? error.message : String(error),
      });
  }
};

export const loginHelp = async (req: Request, res: Response) => {
  const { email, type, query } = req.body;
  console.log("Login help request for:", email, "Type:", type);

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    // We still allow help requests even if user isn't found (maybe they typed wrong email)
    // but we link it if found
    const userName = user ? user.fullname : "Unknown User";
    const userId = user ? user.id : null;

    let typeLabel = "Password Reset";
    if (type === LoginHelpType.UNABLE_TO_LOGIN) typeLabel = "Unable to Login";
    if (type === LoginHelpType.OTHER) typeLabel = "Login Assistance";

    // Create a request for the admin
    const request = await (prisma as any).userRequest.create({
      data: {
        type: type || LoginHelpType.FORGOT_PASSWORD,
        userId: userId,
        email: email,
        message: query || `${userName} requested ${typeLabel.toLowerCase()}.`,
        data: { requestedAt: new Date(), originalType: type },
      },
    });

    // Notify all Admins and Agents
    const staff = await prisma.user.findMany({
      where: {
        OR: [{ role: { name: RoleName.ADMIN } }, { role: { name: RoleName.AGENT } }],
        deleted: false,
      },
    });

    const io = req.app.get("io");

    for (const s of staff) {
      const notification = await prisma.notification.create({
        data: {
          title: `New Login Help: ${typeLabel}`,
          message: `${userName} (${email}) needs help with: ${typeLabel}`,
          type: "request",
          userId: s.id,
          data: { requestId: request.id, type: type || LoginHelpType.FORGOT_PASSWORD },
        },
      });

      if (io) {
        emitNotificationToUser(io, s.id, notification);
      }
    }

    res.json({
      success: true,
      message:
        "Your request has been sent to the administrator. We will contact you soon.",
    });
  } catch (error) {
    console.error("LoginHelp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
