import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: any;
    /** From the role (loadCallerRole): false = delete-restricted (Sub Admin). */
    canDelete?: boolean | null;
    /** Login session id (absent on tokens issued before sessions existed). */
    sid?: string;
  };
}

export interface OnlineUser {
  userId: string;
  fullname: string;
  socketIds: string[];
  status: 'active' | 'idle';
}
