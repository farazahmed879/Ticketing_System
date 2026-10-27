/**
 * One-time backfill: populate `skills`, `yearsExperience`, and `skillEmbedding`
 * on existing candidates so past applicants are searchable by the AI search.
 *
 * Run:  node_modules/.bin/ts-node src/scripts/backfillEnrichment.ts
 *
 * Idempotent — skips candidates that already have an embedding, and reuses any
 * existing enrichment so it won't re-spend Claude tokens. Safe to re-run.
 */
import path from "path";
import dotenv from "dotenv";

// Load env before importing anything that reads process.env (prisma client).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import prisma from "../prisma";
import { aiSearchService } from "../services/aiSearchService";
import { embeddingService } from "../services/embeddingService";

async function main() {
  const candidates = await prisma.candidate.findMany({
    where: { deleted: false },
    select: {
      id: true,
      name: true,
      position: true,
      technicalSkills: true,
      workExperience: true,
      objective: true,
      projects: true,
      skills: true,
      yearsExperience: true,
      skillEmbedding: true,
    },
  });

  console.log(`Found ${candidates.length} candidates.`);

  let done = 0;
  let skipped = 0;
  let failed = 0;

  for (const c of candidates) {
    const text = aiSearchService.candidateEnrichmentText(c);
    if (!text) {
      skipped++;
      continue;
    }

    try {
      // Reuse existing enrichment if present; only call Claude when missing.
      let skills = c.skills ?? [];
      let yearsExperience = c.yearsExperience ?? null;
      if (skills.length === 0 && yearsExperience == null) {
        ({ skills, yearsExperience } =
          await aiSearchService.enrichCandidate(text));
      }

      // Always (re)embed with the concise role+skills text and current model.
      const profileText = aiSearchService.embeddingProfileText({
        position: c.position,
        skills,
        technicalSkills: c.technicalSkills,
      });
      const skillEmbedding = await embeddingService.embedProfile(profileText);

      await prisma.candidate.update({
        where: { id: c.id },
        data: { skills, yearsExperience, skillEmbedding },
      });
      done++;
      console.log(
        `✓ ${c.name} — skills=${skills.length} years=${yearsExperience} embedded=${skillEmbedding.length}d`,
      );
    } catch (err) {
      failed++;
      console.error(`✗ ${c.name} (${c.id}):`, err);
    }

    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`\nDone. processed=${done} skipped=${skipped} failed=${failed}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
