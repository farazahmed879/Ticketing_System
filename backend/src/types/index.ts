import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions?: any;
  };
}

export interface OnlineUser {
  userId: string;
  fullname: string;
  socketIds: string[];
  status: 'active' | 'idle';
}
