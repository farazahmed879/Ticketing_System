import bcrypt from "bcryptjs";
import { userRepository } from "../repositories/user.repository";
import { RoleName, RoleType } from "../utils/constants";

export const userUsecase = {
  async getUsers(
    type: string = "ALL",
    limit: string = "10",
    page: string = "0",
    showDeleted: string = "false",
    search: string = "",
  ) {
    const take = parseInt(limit);
    const skip = parseInt(page) * take;

    let roleFilter: any = {};
    if (type === RoleType.AGENTS)
      roleFilter = { role: { OR: [{ isAgent: true }, { isEmployee: true }] } };
    else if (type === RoleType.ADMINS) roleFilter = { role: { isAdmin: true } };
    else if (type === RoleType.CUSTOMERS)
      roleFilter = { role: { name: RoleName.CUSTOMER } };
    else if (type && type.toLowerCase() !== "all")
      roleFilter = { roleId: type };

    const where: any = {
      deleted: showDeleted === "true" ? undefined : false,
      ...roleFilter,
    };

    if (search) {
      where.OR = [
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];
    }

    const [accounts, total] = await Promise.all([
      userRepository.findMany(where, skip, take === -1 ? undefined : take),
      userRepository.count(where),
    ]);

    return { accounts, total };
  },

  async getUsersByRoles(
    roles: string[] = ["ALL"],
    limit: string = "10",
    page: string = "0",
    showDeleted: string = "false",
    search: string = "",
  ) {
    const take = parseInt(limit);
    const skip = parseInt(page) * take;

    let roleConditions: any[] = [];

    if (roles.includes(RoleName.EMPLOYEE)) {
      roleConditions.push({
        role: {
          OR: [{ isAgent: true }, { isEmployee: true }],
        },
      });
    }

    if (roles.includes(RoleName.ADMIN)) {
      roleConditions.push({
        role: { 
          OR: [
            { isAdmin: true },
            { name: RoleName.ADMIN }
          ]
        },
      });
    }

    if (roles.includes(RoleName.AGENT)) {
      roleConditions.push({
        role: { name: RoleName.AGENT },
      });
    }

    if (roles.includes(RoleName.CUSTOMER)) {
      roleConditions.push({
        role: { name: RoleName.CUSTOMER },
      });
    }

    if (roles.includes(RoleName.HR)) {
      roleConditions.push({
        role: { name: RoleName.HR },
      });
    }

    const where: any = {
      deleted: showDeleted === "true" ? undefined : false,
    };

    // Apply role filters only if not ALL
    if (!roles.includes("ALL") && roleConditions.length > 0) {
      where.OR = roleConditions;
    }

    // Search filter
    if (search) {
      const searchConditions = [
        { fullname: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
      ];

      // combine role + search properly
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];

        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    const [accounts, total] = await Promise.all([
      userRepository.findMany(where, skip, take === -1 ? undefined : take),
      userRepository.count(where),
    ]);

    return { accounts, total };
  },

  async createUser(data: any) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await userRepository.create({
      email: data.email,
      password: hashed,
      fullname: data.fullname,
      username: data.username,
      title: data.title,
      roleId: data.roleId,
      groupIds: data.groupIds || [],
      teamIds: data.teamIds || [],
      primaryContact: data.primaryContact,
      secondaryContact: data.secondaryContact,
      cnic: data.cnic,
      linkedInUrl: data.linkedInUrl,
      gitUrl: data.gitUrl,
      address: data.address,
      emergencyContact: data.emergencyContact,
      primaryResumeUrl: data.primaryResumeUrl,
      jpPatternResumeUrl: data.jpPatternResumeUrl,
      nationality: data.nationality,
      location: data.location,
      employeeType: data.employeeType,
      branch: data.branch,
    });
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  async updateUser(id: string, data: any) {
    const updateData: any = {};
    if (data.fullname !== undefined) updateData.fullname = data.fullname;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.username !== undefined) updateData.username = data.username;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.groupIds !== undefined) updateData.groupIds = data.groupIds;
    if (data.teamIds !== undefined) updateData.teamIds = data.teamIds;

    // New profile fields
    if (data.primaryContact !== undefined)
      updateData.primaryContact = data.primaryContact;
    if (data.secondaryContact !== undefined)
      updateData.secondaryContact = data.secondaryContact;
    if (data.cnic !== undefined) updateData.cnic = data.cnic;
    if (data.linkedInUrl !== undefined)
      updateData.linkedInUrl = data.linkedInUrl;
    if (data.gitUrl !== undefined) updateData.gitUrl = data.gitUrl;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergencyContact !== undefined)
      updateData.emergencyContact = data.emergencyContact;
    if (data.primaryResumeUrl !== undefined)
      updateData.primaryResumeUrl = data.primaryResumeUrl;
    if (data.jpPatternResumeUrl !== undefined)
      updateData.jpPatternResumeUrl = data.jpPatternResumeUrl;
    if (data.nationality !== undefined)
      updateData.nationality = data.nationality;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.employeeType !== undefined)
      updateData.employeeType = data.employeeType;
    if (data.branch !== undefined) updateData.branch = data.branch;
    if (data.leaves !== undefined && data.leaves !== null) {
      updateData.leaves = Number(data.leaves);
    }

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    const user = await userRepository.update(id, updateData);
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  async deleteUser(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");

    if (user.role?.name === RoleName.ADMIN) {
      throw new Error("Admin accounts cannot be deleted");
    }

    return userRepository.update(id, { deleted: true });
  },

  async updateProfile(id: string, data: any) {
    const user = await userRepository.update(id, {
      fullname: data.fullname,
      title: data.title,
      workNumber: data.workNumber,
      mobileNumber: data.mobileNumber,
    });
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  async updatePassword(id: string, currentPass: string, newPass: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");

    const valid = await bcrypt.compare(currentPass, user.password);
    if (!valid) throw new Error("Current password is incorrect");

    const hashed = await bcrypt.hash(newPass, 10);
    await userRepository.update(id, { password: hashed });
  },

  async updatePhoneNumber(id: string, currentPhone: string, newPhone: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");

    // "Confirming previous one" - check if the provided current phone matches
    if (user.mobileNumber && user.mobileNumber !== currentPhone) {
      throw new Error("Current phone number is incorrect");
    }

    await userRepository.update(id, { mobileNumber: newPhone });
  },

  async getUserById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User not found");
    const { password: _, ...safeUser } = user;
    return safeUser;
  },
};
