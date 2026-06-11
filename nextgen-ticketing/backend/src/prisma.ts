import { PrismaClient } from "@prisma/client";

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
          const roleType = isAdmin ? "isAdmin" :
                           isAgent ? "isAgent" :
                           isCustomer ? "isCustomer" :
                           isEmployee ? "isEmployee" :
                           isHR ? "isHR" :
                           isQA ? "isQA" : "isEmployee";
          args.data = { ...rest, roleType };
        }
        return query(args);
      },
      async update({ args, query }: any) {
        if (args.data) {
          const { isAdmin, isAgent, isCustomer, isEmployee, isHR, isQA, ...rest } = args.data;
          const roleType = isAdmin ? "isAdmin" :
                           isAgent ? "isAgent" :
                           isCustomer ? "isCustomer" :
                           isEmployee ? "isEmployee" :
                           isHR ? "isHR" :
                           isQA ? "isQA" : undefined;
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
          return role.roleType === "isAdmin";
        },
      },
      isAgent: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === "isAgent";
        },
      },
      isCustomer: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === "isCustomer";
        },
      },
      isEmployee: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === "isEmployee";
        },
      },
      isHR: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === "isHR";
        },
      },
      isQA: {
        needs: { roleType: true },
        compute(role) {
          return role.roleType === "isQA";
        },
      },
    },
  },
});

export default prisma;
