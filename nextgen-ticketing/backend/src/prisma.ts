import { PrismaClient } from "@prisma/client";
import { RoleType } from "./utils/constants";

const basePrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

const prisma = basePrisma.$extends({
  query: {
    role: {
      async create({ args, query }: any) {
        if (args.data) {
          const { isAdmin, isAgent, isCustomer, isEmployee, isHR, isQA, ...rest } = args.data;
          const roleType = isAdmin ? RoleType.ADMIN :
                           isAgent ? RoleType.AGENT :
                           isCustomer ? RoleType.CUSTOMER :
                           isEmployee ? RoleType.EMPLOYEE :
                           isHR ? RoleType.HR :
                           isQA ? RoleType.QA : RoleType.EMPLOYEE;
          args.data = { ...rest, roleType };
        }
        return query(args);
      },
      async update({ args, query }: any) {
        if (args.data) {
          const { isAdmin, isAgent, isCustomer, isEmployee, isHR, isQA, ...rest } = args.data;
          const roleType = isAdmin ? RoleType.ADMIN :
                           isAgent ? RoleType.AGENT :
                           isCustomer ? RoleType.CUSTOMER :
                           isEmployee ? RoleType.EMPLOYEE :
                           isHR ? RoleType.HR :
                           isQA ? RoleType.QA : undefined;
          const updateData = roleType ? { ...rest, roleType } : rest;
          args.data = updateData;
        }
        return query(args);
      },
    },
  },
  result: {
    role: {
      isAdmin: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.ADMIN;
        },
      },
      isAgent: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.AGENT;
        },
      },
      isCustomer: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.CUSTOMER;
        },
      },
      isEmployee: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.EMPLOYEE;
        },
      },
      isHR: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.HR;
        },
      },
      isQA: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === RoleType.QA;
        },
      },
    },
  },
});

export { basePrisma };
export default prisma;
