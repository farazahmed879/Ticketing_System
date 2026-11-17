import { Request, Response } from "express";
import { projectRepository } from "../repositories/project.repository";
import { RoleType } from "../utils/constants";

const MAX_LINKS = 20;
const MAX_LABEL_LENGTH = 60;
const MAX_URL_LENGTH = 2048;
// SSH clone URLs such as git@github.com:org/repo.git
const SSH_GIT_RE = /^[\w.-]+@[\w.-]+:[\w./~-]+$/;

const badRequest = (message: string) => Object.assign(new Error(message), { status: 400 });

/**
 * Validates a list of { label?, url } links. Rows with an empty URL are
 * dropped. Returns undefined when the field wasn't sent (update keeps it).
 */
function sanitizeLinks(value: unknown, kind: "repo" | "site") {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value)) throw badRequest(`${kind === "repo" ? "gitRepos" : "siteUrls"} must be a list.`);
  const what = kind === "repo" ? "Git repository" : "Site URL";

  const links = value
    .map((item: any) => ({
      label: typeof item?.label === "string" ? item.label.trim() : "",
      url: typeof item?.url === "string" ? item.url.trim() : "",
    }))
    .filter((l) => l.url);

  if (links.length > MAX_LINKS) throw badRequest(`At most ${MAX_LINKS} ${what.toLowerCase()} links allowed.`);

  return links.map((l) => {
    if (l.url.length > MAX_URL_LENGTH) throw badRequest(`${what} is too long.`);
    if (l.label.length > MAX_LABEL_LENGTH) {
      throw badRequest(`Labels can be at most ${MAX_LABEL_LENGTH} characters.`);
    }
    let ok = false;
    try {
      const parsed = new URL(l.url);
      ok = parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch {
      ok = kind === "repo" && SSH_GIT_RE.test(l.url);
    }
    if (!ok) {
      throw badRequest(
        `"${l.url}" is not a valid ${what.toLowerCase()} (use an http(s) link${
          kind === "repo" ? " or git@host:org/repo.git" : ""
        }).`,
      );
    }
    return { label: l.label || null, url: l.url };
  });
}

const PROJECT_STATUSES = new Set(["Active", "On Hold", "Completed", "Cancelled"]);
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;
const MAX_NAME_LENGTH = 200;

/** Optional single ObjectId: "" / null clears it, undefined leaves it alone. */
function optionalId(value: unknown, field: string): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !OBJECT_ID_RE.test(value)) {
    throw badRequest(`${field} is not a valid id.`);
  }
  return value;
}

/** Optional list of ObjectIds (deduplicated). */
function idList(value: unknown, field: string): string[] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== "string" || !OBJECT_ID_RE.test(v))) {
    throw badRequest(`${field} must be a list of valid ids.`);
  }
  return Array.from(new Set(value as string[]));
}

/**
 * Builds the create/update data from an explicit allow-list of fields.
 * Anything else in the body (deleted, createdById, createdAt, or Prisma
 * nested writes like `tickets: { deleteMany: {} }`) is ignored, so a
 * request can never touch more than the project form itself can.
 */
function projectData(body: any, mode: "create" | "update") {
  const data: Record<string, unknown> = {};
  const src = body && typeof body === "object" ? body : {};

  if (src.name !== undefined || mode === "create") {
    const name = typeof src.name === "string" ? src.name.trim() : "";
    if (!name) throw badRequest("Project name is required.");
    if (name.length > MAX_NAME_LENGTH) {
      throw badRequest(`Project name can be at most ${MAX_NAME_LENGTH} characters.`);
    }
    data.name = name;
  }

  if (src.description !== undefined) {
    if (src.description !== null && typeof src.description !== "string") {
      throw badRequest("description must be text.");
    }
    data.description = src.description;
  }

  if (src.status !== undefined) {
    if (!PROJECT_STATUSES.has(src.status)) throw badRequest("Invalid project status.");
    data.status = src.status;
  }

  const departmentId = optionalId(src.departmentId, "departmentId");
  if (departmentId !== undefined) data.departmentId = departmentId;
  // The repository maps "" / null to "no manager".
  const managerId = optionalId(src.managerId, "managerId");
  if (managerId !== undefined) data.managerId = managerId;

  const clientIds = idList(src.clientIds, "clientIds");
  if (clientIds !== undefined) data.clientIds = clientIds;
  const teamIds = idList(src.teamIds, "teamIds");
  if (teamIds !== undefined) data.teamIds = teamIds;

  const gitRepos = sanitizeLinks(src.gitRepos, "repo");
  if (gitRepos !== undefined) data.gitRepos = gitRepos;
  const siteUrls = sanitizeLinks(src.siteUrls, "site");
  if (siteUrls !== undefined) data.siteUrls = siteUrls;

  return data;
}

/** Repositories are internal: clients get projects without them. */
function forViewer<T extends { gitRepos?: unknown }>(project: T, user: any): T {
  if (user?.role !== RoleType.CUSTOMER) return project;
  const { gitRepos: _hidden, ...rest } = project;
  return rest as T;
}

export const projectController = {
  async getAll(req: Request, res: Response) {
    try {
      const user = (req as any).user;
      const query: any = { ...req.query };

      const role = user?.role || req.query.role;
      const userId = user?.id || req.query.userId;

      // Client: only projects they are assigned to
      if (role === RoleType.CUSTOMER && userId && req.query.all !== "true") {
        query.clientId = userId;
      }

      // Pagination
      const limitVal = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;
      const pageVal = req.query.page
        ? parseInt(req.query.page as string)
        : undefined;

      const take = limitVal && limitVal !== -1 ? limitVal : undefined;
      const skip =
        pageVal !== undefined && take !== undefined
          ? pageVal * take
          : undefined;

      // Remove pagination and custom keys from query to prevent filtering on them in repository where clause
      delete query.limit;
      delete query.page;
      delete query.all;

      const { projects, total } = await projectRepository.findMany(
        query,
        skip,
        take,
      );
      res.json({
        success: true,
        projects: projects.map((p: any) => forViewer(p, user)),
        total,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const project = await projectRepository.findById(req.params.id as string);
      if (!project)
        return res
          .status(404)
          .json({ success: false, error: "Project not found" });
      res.json({ success: true, project: forViewer(project, (req as any).user) });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const payload = {
        ...projectData(req.body, "create"),
        createdById: (req as any).user?.id,
      };
      const project = await projectRepository.create(payload);
      res.status(201).json({ success: true, project });
    } catch (err: any) {
      if (err?.status === 400) {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (err?.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: `A project named "${req.body.name}" already exists. Please choose a different name.`,
        });
      }
      console.error("Failed to create project:", err);
      res.status(500).json({
        success: false,
        error: "Could not create the project. Please try again.",
      });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const project = await projectRepository.update(
        req.params.id as string,
        projectData(req.body, "update"),
      );
      res.json({ success: true, project });
    } catch (err: any) {
      if (err?.status === 400) {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (err?.code === "P2002") {
        return res.status(409).json({
          success: false,
          error: `A project named "${req.body.name}" already exists. Please choose a different name.`,
        });
      }
      console.error("Failed to update project:", err);
      res.status(500).json({
        success: false,
        error: "Could not update the project. Please try again.",
      });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      await projectRepository.delete(req.params.id as string);
      res.json({ success: true, message: "Project deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getMembers(req: Request, res: Response) {
    try {
      const project = await projectRepository.findByIdWithMembers(
        req.params.id as string,
      );
      if (!project)
        return res
          .status(404)
          .json({ success: false, error: "Project not found" });
      const membersMap = new Map<string, any>();
      project.teams.forEach((team: any) => {
        team.members.forEach((member: any) => {
          const isTeamLead = team.teamLeadId === member.id;
          if (!membersMap.has(member.id)) {
            membersMap.set(member.id, {
              ...member,
              teamNames: [team.name],
              isTeamLead,
              // Teams within this project where the member is the lead.
              leadTeamNames: isTeamLead ? [team.name] : [],
            });
          } else {
            const existing = membersMap.get(member.id);
            if (!existing.teamNames.includes(team.name)) {
              existing.teamNames.push(team.name);
            }
            if (isTeamLead) {
              existing.isTeamLead = true;
              if (!existing.leadTeamNames.includes(team.name)) {
                existing.leadTeamNames.push(team.name);
              }
            }
          }
        });
      });

      const members = Array.from(membersMap.values());
      res.json({ success: true, members });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  async getDeveloperHours(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const data = await projectRepository.getDeveloperHours(
        id as string,
        typeof startDate === "string" ? startDate : undefined,
        typeof endDate === "string" ? endDate : undefined
      );

      if (!data) {
        return res
          .status(404)
          .json({ success: false, error: "Project not found" });
      }

      res.json({ success: true, ...data });
    } catch (err: any) {
      console.error("Failed to get developer hours:", err);
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
