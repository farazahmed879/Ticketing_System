import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // Find users with their roles (just using select)
    const users = await prisma.user.findMany({ select: { id: true, roleId: true } });
    
    for (const u of users) {
      if (!u.roleId) {
        console.log(`User ${u.id} has no roleId. Deleting...`);
        await prisma.user.delete({ where: { id: u.id } });
        continue;
      }
      
      const role = await prisma.role.findUnique({ where: { id: u.roleId } });
      if (!role) {
        console.log(`User ${u.id} has invalid roleId ${u.roleId}. Deleting...`);
        await prisma.user.delete({ where: { id: u.id } });
      }
    }
    console.log("Cleanup complete");
  } catch (err) {
    console.error("Error during cleanup:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
