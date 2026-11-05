import { Request, Response, NextFunction } from "express";
import { z } from "zod";

/**
 * Validates req.body against a zod schema. On success the parsed value
 * replaces req.body (unknown keys are kept unless the schema is strict);
 * on failure responds 400 with a readable message per field.
 */
export const validateBody =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join(".") || "(body)",
        message: i.message,
      }));
      // Screens read either `message` or `error`, so both carry the details.
      const text = issues.map((i) => `${i.field}: ${i.message}`).join("; ");
      return res.status(400).json({
        success: false,
        message: text,
        error: text,
        issues,
      });
    }
    req.body = result.data;
    next();
  };

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");
const trimmed = (max: number) => z.string().trim().min(1, "Required").max(max);

export const schemas = {
  login: z.object({
    // "email" is really an identifier: company email or username.
    email: trimmed(254),
    password: z.string().min(1, "Required").max(200),
  }),

  register: z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(6, "Must be at least 6 characters").max(200),
    fullname: trimmed(120),
    username: z.string().trim().min(1).max(60).optional(),
  }),

  loginHelp: z.object({
    email: z.string().trim().max(254),
    type: z.enum(["FORGOT_PASSWORD", "UNABLE_TO_LOGIN", "OTHER"]).optional(),
    query: z.string().max(2000).optional(),
  }),

  changePassword: z.object({
    currentPassword: z.string().min(1, "Required").max(200),
    newPassword: z.string().min(6, "Must be at least 6 characters").max(200),
  }),

  // Only the security-relevant fields are constrained; the rest of the large
  // user form passes through unchanged (looseObject keeps unknown keys).
  createUser: z.looseObject({
    email: z.string().trim().email().max(254),
    password: z.string().min(6, "Must be at least 6 characters").max(200),
    fullname: trimmed(120),
    roleId: objectId,
  }),

  updateUser: z.looseObject({
    email: z.string().trim().email().max(254).optional(),
    fullname: trimmed(120).optional(),
    roleId: objectId.optional(),
    // The edit form sends "" when the password is left blank; a non-empty
    // value is an Admin/HR password reset.
    password: z
      .union([
        z.literal(""),
        z.string().min(6, "Must be at least 6 characters").max(200),
      ])
      .optional(),
  }),
};
