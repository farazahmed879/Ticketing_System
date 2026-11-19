import prisma from "../prisma";

/**
 * HR documents issued by Admin / Sub Admin (pay slips, offer letters, ...).
 * The backend stores the form data + a letterhead snapshot; the frontend
 * renders the printable document from those, so the same document always
 * looks the same when re-opened.
 */
export const DOCUMENT_TYPES = [
  "payslip",
  "offer_letter",
  "appointment_letter",
  "increment_letter",
  "promotion_letter",
  "experience_letter",
  "salary_certificate",
  "relieving_letter",
  "warning_letter",
  "custom",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  payslip: "Pay Slip",
  offer_letter: "Offer Letter",
  appointment_letter: "Appointment Letter",
  increment_letter: "Increment Letter",
  promotion_letter: "Promotion Letter",
  experience_letter: "Experience Letter",
  salary_certificate: "Salary Certificate",
  relieving_letter: "Relieving Letter",
  warning_letter: "Warning Letter",
  custom: "Custom Letter",
};

const COMPANY_FIELDS = [
  "name",
  "logo",
  "address",
  "phone",
  "email",
  "website",
  "signatoryName",
  "signatoryTitle",
  "signature",
  "footerNote",
] as const;

const IMAGE_DATA_URL_RE = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i;
const MAX_IMAGE_CHARS = 1_500_000; // ~1.1MB binary

export class DocumentError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

const cleanImage = (v: unknown, field: string) => {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "string" || !IMAGE_DATA_URL_RE.test(v)) {
    throw new DocumentError(`${field} must be a PNG, JPG, WEBP, GIF or SVG image`);
  }
  if (v.length > MAX_IMAGE_CHARS) {
    throw new DocumentError(`${field} image is too large (max ~1MB)`);
  }
  return v;
};

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i;
/** Malformed ids would make Prisma throw (500); treat them as not found. */
const assertId = (id: unknown, what: string) => {
  if (typeof id !== "string" || !OBJECT_ID_RE.test(id)) {
    throw new DocumentError(`${what} not found`, 404);
  }
};

const str = (v: unknown, max = 2000) =>
  typeof v === "string" ? v.trim().slice(0, max) : v == null ? null : String(v).slice(0, max);

export const documentUsecase = {
  async getCompany() {
    return prisma.companyProfile.upsert({
      where: { key: "global" },
      update: {},
      create: { key: "global", name: "" },
    });
  },

  async updateCompany(body: any) {
    const data: Record<string, any> = {};
    for (const f of COMPANY_FIELDS) {
      if (!(f in (body || {}))) continue;
      data[f] =
        f === "logo" || f === "signature"
          ? cleanImage(body[f], f === "logo" ? "Logo" : "Signature")
          : str(body[f]);
    }
    if ("name" in data) data.name = data.name || "";
    return prisma.companyProfile.upsert({
      where: { key: "global" },
      update: data,
      create: { key: "global", name: "", ...data },
    });
  },

  /** Letterhead snapshot stored on each document (no DB ids/timestamps). */
  async companySnapshot() {
    const c = await this.getCompany();
    const snap: Record<string, any> = {};
    for (const f of COMPANY_FIELDS) snap[f] = (c as any)[f] ?? null;
    return snap;
  },

  validate(body: any) {
    const type = body?.type as DocumentType;
    if (!DOCUMENT_TYPES.includes(type)) {
      throw new DocumentError("Unknown document type");
    }
    const recipientName = str(body?.recipientName, 200);
    if (!recipientName) throw new DocumentError("Recipient name is required");
    if (!body?.data || typeof body.data !== "object" || Array.isArray(body.data)) {
      throw new DocumentError("Document details are required");
    }
    const title = str(body?.title, 200) || DOCUMENT_LABELS[type];
    return { type, recipientName, title, data: body.data };
  },

  async assertEmployee(userId?: string | null) {
    if (!userId) return null;
    assertId(userId, "Employee");
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted: false },
      select: { id: true },
    });
    if (!user) throw new DocumentError("Employee not found", 404);
    return user.id;
  },

  async list(params: {
    type?: string;
    userId?: string;
    search?: string;
    /** true = delivered only, false = drafts only, undefined = both. */
    delivered?: boolean;
    page?: number;
    limit?: number;
  }) {
    const where: any = { deleted: false };
    if (params.type && DOCUMENT_TYPES.includes(params.type as DocumentType)) {
      where.type = params.type;
    }
    if (params.userId) {
      if (!OBJECT_ID_RE.test(params.userId)) return { items: [], total: 0 };
      where.userId = params.userId;
    }
    if (params.delivered !== undefined) where.delivered = params.delivered;
    if (params.search?.trim()) {
      const q = params.search.trim();
      where.OR = [
        { recipientName: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
      ];
    }
    const take = Math.min(Math.max(params.limit || 20, 1), 100);
    const skip = Math.max(params.page || 0, 0) * take;
    const [items, total] = await Promise.all([
      prisma.hrDocument.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        // List rows don't need the (possibly large) letterhead images.
        select: {
          id: true,
          type: true,
          title: true,
          userId: true,
          recipientName: true,
          issuedByName: true,
          delivered: true,
          deliveredAt: true,
          deliveredByName: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.hrDocument.count({ where }),
    ]);
    return { items, total };
  },

  /** The employee's delivered documents (drafts stay with the admins). */
  async listForUser(userId: string) {
    return prisma.hrDocument.findMany({
      where: { userId, deleted: false, delivered: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        title: true,
        recipientName: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  },

  async getById(id: string) {
    assertId(id, "Document");
    const doc = await prisma.hrDocument.findFirst({ where: { id, deleted: false } });
    if (!doc) throw new DocumentError("Document not found", 404);
    return doc;
  },

  /** Saved as a draft; the employee only gets it once it's delivered. */
  async create(body: any, issuer: { id: string }) {
    const v = this.validate(body);
    const userId = await this.assertEmployee(body?.userId);
    // Generated for an employee's document request? Check it now; the
    // request is fulfilled when the document is delivered.
    const request = body?.requestId ? await this.pendingDocumentRequest(body.requestId, userId) : null;
    const issuerUser = await prisma.user.findUnique({
      where: { id: issuer.id },
      select: { fullname: true },
    });
    return prisma.hrDocument.create({
      data: {
        ...v,
        userId,
        company: await this.companySnapshot(),
        issuedById: issuer.id,
        issuedByName: issuerUser?.fullname || "Admin",
        delivered: false,
        requestId: request?.id ?? null,
      },
    });
  },

  /**
   * Hand the document to its employee: from now on they see it on their
   * profile (and get notified). Fulfils the document request it was
   * generated for, if that's still pending.
   */
  async deliver(id: string, by: { id: string }) {
    const doc = await this.getById(id);
    if (!doc.userId) {
      throw new DocumentError(
        "Only documents issued to an employee can be delivered. Download the PDF to share it with an external recipient.",
      );
    }
    if (doc.delivered) throw new DocumentError("This document has already been delivered");
    const employee = await prisma.user.findFirst({
      where: { id: doc.userId, deleted: false },
      select: { id: true },
    });
    if (!employee) throw new DocumentError("This employee is no longer active");
    const deliverer = await prisma.user.findUnique({
      where: { id: by.id },
      select: { fullname: true },
    });
    const delivered = await prisma.hrDocument.update({
      where: { id },
      data: {
        delivered: true,
        deliveredAt: new Date(),
        deliveredById: by.id,
        deliveredByName: deliverer?.fullname || "Admin",
      },
    });
    if (doc.requestId) {
      const request = await prisma.userRequest.findFirst({
        where: { id: doc.requestId, deleted: false, status: "PENDING", userId: doc.userId },
      });
      if (request) {
        // Approved by whoever delivered it, linked to the document.
        await prisma.userRequest.update({
          where: { id: request.id },
          data: {
            status: "APPROVED",
            approvedById: by.id,
            data: { ...((request.data as object) || {}), documentId: doc.id },
          },
        });
      }
    }
    return delivered;
  },

  /**
   * Documents issued before delivery existed were already shown to their
   * employees: mark them delivered so they stay visible. New documents
   * always store `delivered`, so this only touches old ones. Safe on every boot.
   */
  async markLegacyDelivered() {
    try {
      // Raw: Prisma can't filter a required field on "not stored".
      const res: any = await prisma.$runCommandRaw({
        update: "HrDocument",
        updates: [
          { q: { delivered: { $exists: false } }, u: { $set: { delivered: true } }, multi: true },
        ],
      });
      const count = Number(res?.nModified ?? 0);
      if (count) console.log(`[documents] Marked ${count} earlier document(s) as delivered.`);
    } catch (err) {
      console.error("[documents] Could not mark earlier documents as delivered:", err);
    }
  },

  /** A pending document request by `userId` (the document's employee). */
  async pendingDocumentRequest(requestId: unknown, userId: string | null) {
    assertId(requestId, "Request");
    const request = await prisma.userRequest.findFirst({
      where: { id: requestId as string, deleted: false, type: "DOCUMENT_REQUEST" },
    });
    if (!request) throw new DocumentError("Document request not found", 404);
    if (request.status !== "PENDING") {
      throw new DocumentError("This document request has already been handled");
    }
    if (!userId || request.userId !== userId) {
      throw new DocumentError("The document must be issued to the employee who requested it");
    }
    return request;
  },

  /** Editing re-issues the document with the current letterhead. */
  async update(id: string, body: any) {
    await this.getById(id);
    const v = this.validate(body);
    const userId = await this.assertEmployee(body?.userId);
    return prisma.hrDocument.update({
      where: { id },
      data: { ...v, userId, company: await this.companySnapshot() },
    });
  },

  async remove(id: string) {
    await this.getById(id);
    return prisma.hrDocument.update({ where: { id }, data: { deleted: true } });
  },

  /**
   * Values to pre-fill a new document for an employee, keyed by form field.
   * Current profile data wins (name, designation, CNIC, address, department,
   * manager...). Things the profile doesn't store (joining date, salary,
   * bank, earnings/deductions) come from the employee's most recent earlier
   * documents. Everything stays editable in the form.
   */
  async prefill(userId: string) {
    assertId(userId, "Employee");
    const user = await prisma.user.findFirst({
      where: { id: userId, deleted: false },
      select: {
        id: true,
        fullname: true,
        title: true,
        cnic: true,
        address: true,
        username: true,
        companyEmail: true,
        email: true,
        location: true,
        branch: true,
        employeeType: true,
        teams: {
          where: { deleted: false },
          select: {
            teamType: true,
            department: { select: { name: true, deleted: true } },
            teamLead: { select: { id: true, fullname: true } },
          },
        },
      },
    });
    if (!user) throw new DocumentError("Employee not found", 404);

    // Organizational team first: it's the reporting line / home department.
    const teams = [...user.teams].sort(
      (a, b) => Number(b.teamType === "ORGANIZATIONAL") - Number(a.teamType === "ORGANIZATIONAL"),
    );
    const department = teams.find((t) => t.department && !t.department.deleted)?.department?.name;
    const manager = teams.find((t) => t.teamLead && t.teamLead.id !== user.id)?.teamLead?.fullname;
    const place = user.branch || user.location;
    const workLocation = place
      ? user.employeeType
        ? `${place} (${user.employeeType})`
        : place
      : user.employeeType || undefined;

    const values: Record<string, any> = {};
    const sources: Record<string, "profile" | "documents"> = {};
    const put = (key: string, v: unknown, src: "profile" | "documents") => {
      const empty =
        v === undefined || v === null || (typeof v === "string" && !v.trim()) ||
        (Array.isArray(v) && v.length === 0);
      if (empty || key in values) return;
      values[key] = v;
      sources[key] = src;
    };

    put("recipientName", user.fullname, "profile");
    put("designation", user.title, "profile");
    put("cnic", user.cnic, "profile");
    put("recipientAddress", user.address, "profile");
    put("employeeId", user.username, "profile");
    put("email", user.companyEmail || user.email, "profile");
    put("department", department, "profile");
    put("reportingTo", manager, "profile");
    put("workLocation", workLocation, "profile");

    // Newest first; the first document that has a value wins.
    const docs = await prisma.hrDocument.findMany({
      where: { userId, deleted: false },
      orderBy: { updatedAt: "desc" },
      take: 25,
      select: { type: true, data: true },
    });
    const CARRY = [
      "designation",
      "department",
      "cnic",
      "employeeId",
      "joiningDate",
      "salary",
      "currency",
      "bankName",
      "accountNo",
      "employmentType",
      "probationMonths",
      "workingHours",
      "noticePeriod",
      "workLocation",
      "reportingTo",
      "recipientAddress",
    ];
    for (const d of docs) {
      const raw = (d.data || {}) as Record<string, any>;
      // An increment/promotion letter's new salary/designation is the
      // employee's current one from then on.
      const data: Record<string, any> = {
        ...raw,
        salary: raw.newSalary || raw.salary,
        designation: raw.newDesignation || raw.designation,
      };
      for (const k of CARRY) put(k, data[k], "documents");
      // Salary breakdown only from the latest pay slip.
      if (d.type === "payslip" && !("earnings" in values)) {
        const rows = (items: any) =>
          Array.isArray(items)
            ? items
                .filter((i) => i && (String(i.label ?? "").trim() || String(i.amount ?? "").trim()))
                .map((i) => ({ label: String(i.label ?? ""), amount: i.amount ?? "" }))
            : [];
        put("earnings", rows(data.earnings), "documents");
        put("deductions", rows(data.deductions), "documents");
      }
    }
    // Salary certificate / letters: fall back to gross from the last pay slip.
    if (!("salary" in values) && Array.isArray(values.earnings)) {
      const gross = values.earnings.reduce(
        (s: number, i: any) => s + (parseFloat(String(i.amount).replace(/,/g, "")) || 0),
        0,
      );
      if (gross > 0) put("salary", gross, "documents");
    }

    return { values, sources };
  },

  /**
   * Candidates to address offer / appointment letters to. Only the fields a
   * letter needs (no resume, embeddings, notes). Newest first, max 20.
   */
  async searchCandidates(search?: string) {
    const q = (search || "").trim().slice(0, 100);
    return prisma.candidate.findMany({
      where: {
        deleted: false,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { email: { contains: q, mode: "insensitive" } },
                { position: { contains: q, mode: "insensitive" } },
                { cnic: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        position: true,
        cnic: true,
        address: true,
        city: true,
        status: true,
      },
    });
  },

  async notifyIssued(doc: { id: string; userId: string | null; type: string; title: string }, updated = false) {
    if (!doc.userId) return null;
    const label = DOCUMENT_LABELS[doc.type as DocumentType] || "document";
    return prisma.notification.create({
      data: {
        title: updated ? `${label} updated` : `New ${label.toLowerCase()} issued`,
        message: updated
          ? `Your ${doc.title} was updated. Open your profile to view or download it.`
          : `A ${doc.title} has been issued to you. Open your profile to view or download it.`,
        type: "document",
        userId: doc.userId,
        data: { documentId: doc.id },
      },
    });
  },
};
