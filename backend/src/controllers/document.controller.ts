import { Response } from "express";
import { AuthRequest } from "../types";
import { documentUsecase, DocumentError } from "../usecases/document.usecase";
import { loadCallerRole } from "../middleware/auth";
import { RoleType } from "../utils/constants";
import { emitNotificationToUser } from "../socketio/events";

const fail = (res: Response, error: any, what: string) => {
  if (error instanceof DocumentError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(`[documents] ${what} failed:`, error);
  return res.status(500).json({ message: `Failed to ${what}` });
};

const notify = async (req: AuthRequest, doc: any, updated = false) => {
  try {
    const n = await documentUsecase.notifyIssued(doc, updated);
    const io = req.app.get("io");
    if (n && io) emitNotificationToUser(io, n.userId, n);
  } catch (err) {
    console.error("[documents] notification failed:", err);
  }
};

export const documentController = {
  async getCompany(_req: AuthRequest, res: Response) {
    try {
      res.json({ company: await documentUsecase.getCompany() });
    } catch (e) {
      fail(res, e, "load company profile");
    }
  },

  async updateCompany(req: AuthRequest, res: Response) {
    try {
      res.json({ company: await documentUsecase.updateCompany(req.body) });
    } catch (e) {
      fail(res, e, "save company profile");
    }
  },

  async list(req: AuthRequest, res: Response) {
    try {
      const q = req.query;
      const result = await documentUsecase.list({
        type: q.type as string | undefined,
        userId: q.userId as string | undefined,
        search: q.search as string | undefined,
        page: q.page ? Number(q.page) : 0,
        limit: q.limit ? Number(q.limit) : 20,
      });
      res.json(result);
    } catch (e) {
      fail(res, e, "load documents");
    }
  },

  /** The caller's own documents (any role). */
  async mine(req: AuthRequest, res: Response) {
    try {
      res.json({ items: await documentUsecase.listForUser(req.user!.id) });
    } catch (e) {
      fail(res, e, "load your documents");
    }
  },

  /** Admin-type roles see any document; everyone else only their own. */
  async getById(req: AuthRequest, res: Response) {
    try {
      const doc = await documentUsecase.getById(req.params.id as string);
      const role = await loadCallerRole(req);
      const isAdmin = role?.roleType === RoleType.ADMIN;
      // Employees only see their own documents, and only once delivered.
      if (!isAdmin && (doc.userId !== req.user!.id || !doc.delivered)) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ document: doc });
    } catch (e) {
      fail(res, e, "load document");
    }
  },

  async prefill(req: AuthRequest, res: Response) {
    try {
      res.json(await documentUsecase.prefill(req.params.userId as string));
    } catch (e) {
      fail(res, e, "load employee details");
    }
  },

  async candidates(req: AuthRequest, res: Response) {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : "";
      res.json({ items: await documentUsecase.searchCandidates(search) });
    } catch (e) {
      fail(res, e, "load candidates");
    }
  },

  async create(req: AuthRequest, res: Response) {
    try {
      // A draft: the employee is notified when it's delivered.
      const doc = await documentUsecase.create(req.body, req.user!);
      res.status(201).json({ document: doc });
    } catch (e) {
      fail(res, e, "create document");
    }
  },

  async update(req: AuthRequest, res: Response) {
    try {
      const doc = await documentUsecase.update(req.params.id as string, req.body);
      // Only tell the employee about changes to a document they already have.
      if (doc.delivered) await notify(req, doc, true);
      res.json({ document: doc });
    } catch (e) {
      fail(res, e, "update document");
    }
  },

  async deliver(req: AuthRequest, res: Response) {
    try {
      const doc = await documentUsecase.deliver(req.params.id as string, req.user!);
      await notify(req, doc);
      res.json({ document: doc });
    } catch (e) {
      fail(res, e, "deliver document");
    }
  },

  async remove(req: AuthRequest, res: Response) {
    try {
      await documentUsecase.remove(req.params.id as string);
      res.json({ success: true, id: req.params.id });
    } catch (e) {
      fail(res, e, "delete document");
    }
  },
};
