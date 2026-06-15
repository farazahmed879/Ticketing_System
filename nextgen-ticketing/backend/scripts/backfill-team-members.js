const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Existing teams had memberIds set directly (one-sided), so User.teamIds was
// never updated and getMyTeam (which reads User.teams) returned nothing.
// Re-applying members via `set` re-establishes both sides of the m2m.
async function main() {
  const teams = await prisma.team.findMany({
    where: { deleted: false },
    select: { id: true, name: true, memberIds: true },
  });

  let fixed = 0;
  for (const t of teams) {
    if (!t.memberIds?.length) continue;
    await prisma.team.update({
      where: { id: t.id },
      data: { members: { set: t.memberIds.map((id) => ({ id })) } },
    });
    console.log(`Synced ${t.memberIds.length} member(s) for team "${t.name}"`);
    fixed++;
  }
  console.log(`Done. Re-synced ${fixed} team(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
