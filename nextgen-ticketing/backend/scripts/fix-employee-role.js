const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Updating Employee role permissions...');
  
  const employeeRole = await prisma.role.findUnique({
    where: { name: 'Employee' }
  });

  if (employeeRole) {
    await prisma.role.update({
      where: { id: employeeRole.id },
      data: {
        permissions: {
          tickets: { view: true, create: true, update: true, delete: false },
          messages: { view: true, create: true },
          groups: { view: true },
          teams: { view: true }
        }
      }
    });
    console.log('✅ Employee role updated successfully.');
  } else {
    console.log('❌ Employee role not found.');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
