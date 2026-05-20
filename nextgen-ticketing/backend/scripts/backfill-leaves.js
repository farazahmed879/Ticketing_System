const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Backfilling User.leaves = 20 for all existing users...');

  const result = await prisma.user.updateMany({
    where: {},
    data: { leaves: 20 },
  });

  console.log(`Updated ${result.count} user(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
