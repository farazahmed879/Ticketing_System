import bcrypt from "bcryptjs";
import { authRepository } from "../repositories/auth.repository";
import { RoleName, LoginHelpType } from "../utils/constants";

export const authUsecase = {
  async login(email: string, passwordPlain: string) {
    const user = await authRepository.findUserByEmailOrUsername(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.password);

    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const mustChangePassword = (user as any).mustChangePassword !== false;


    // The access token is issued by the controller together with a session
    // (see services/sessionService.ts).
    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        leaves: user.leaves,
        isLead: user.isLead,
        mustChangePassword,
        role: {
          name: user.role.name,
          roleType: user.role.roleType,
          permissions: user.role.permissions,
          canDelete: user.role.canDelete,
        },
      },
    };
  },

  async getMe(userId: string) {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const mustChangePassword = (user as any).mustChangePassword !== false;

    return {
      id: user.id,
      email: user.email,
      fullname: user.fullname,
      title: user.title,
      image: user.image,
      leaves: user.leaves,
      isLead: user.isLead,
      mustChangePassword: Boolean(mustChangePassword),
      role: {
        name: user.role.name,
        roleType: user.role.roleType,
        permissions: user.role.permissions,
        canDelete: user.role.canDelete,
      },
    };
  },

  async register(
    email: string,
    passwordPlain: string,
    fullname: string,
    username?: string,
  ) {
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    if (username) {
      const existingUsername =
        await authRepository.findUserByUsername(username);
      if (existingUsername) {
        throw new Error("Username already taken");
      }
    }

    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    let role = await authRepository.findRoleByName(RoleName.CUSTOMER);
    if (!role) {
      role = await authRepository.createRole({
        name: RoleName.CUSTOMER,
        description: "Default customer role",
        permissions: { tickets: { view: true, create: true } },
      });
    }

    const user = await authRepository.createUser({
      email,
      username,
      password: hashedPassword,
      fullname,
      roleId: role!.id,
    });


    // The access token is issued by the controller together with a session
    // (see services/sessionService.ts).
    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        isLead: user.isLead,
        role: {
          name: user.role.name,
          roleType: user.role.roleType,
          permissions: user.role.permissions,
          canDelete: user.role.canDelete,
        },
      },
    };
  },

  async loginHelp(email: string, type: string, query: string) {
    const user = await authRepository.findUserByEmail(email);

    const userName = user ? user.fullname : "Unknown User";
    const userId = user ? user.id : null;

    let typeLabel = "Password Reset";
    if (type === LoginHelpType.UNABLE_TO_LOGIN) typeLabel = "Unable to Login";
    if (type === LoginHelpType.OTHER) typeLabel = "Login Assistance";

    const request = await authRepository.createRequest({
      type: type || LoginHelpType.FORGOT_PASSWORD,
      userId: userId,
      email: email,
      message: query || `${userName} requested ${typeLabel.toLowerCase()}.`,
      data: { requestedAt: new Date(), originalType: type },
    });

    const staff = await authRepository.findStaff();
    const notifications = [];

    for (const s of staff) {
      const notification = await authRepository.createNotification({
        data: {
          title: `New Login Help: ${typeLabel}`,
          message: `${userName} (${email}) needs help with: ${typeLabel}`,
          type: "request",
          userId: s.id,
          data: {
            requestId: request.id,
            type: type || LoginHelpType.FORGOT_PASSWORD,
          },
        },
      });
      notifications.push({ userId: s.id, notification });
    }

    return { notifications };
  },
};
