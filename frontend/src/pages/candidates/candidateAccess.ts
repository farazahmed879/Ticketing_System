import { ROLE_TYPE } from "../roles/roleConstants";

// Mirrors the backend (candidateRoutes.ts / candidate.usecase.ts): only these
// role types get the candidate list and manage actions. Everyone else can
// only open profiles of candidates whose interview panel they are on.
const FULL_ACCESS_ROLE_TYPES: string[] = [
  ROLE_TYPE.ADMIN,
  ROLE_TYPE.AGENT,
  ROLE_TYPE.HR,
];

export const canManageCandidates = (
  user: { role?: { roleType?: string } } | null | undefined,
) => FULL_ACCESS_ROLE_TYPES.includes(user?.role?.roleType ?? "");
