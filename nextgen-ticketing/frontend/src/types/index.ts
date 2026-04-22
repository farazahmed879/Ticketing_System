export interface User {
  id: string;
  fullname: string;
  email: string;
  title?: string;
  role: {
    id: string;
    name: string;
    isAdmin?: boolean;
    isAgent?: boolean;
    isCustomer?: boolean;
    isEmployee?: boolean;
    permissions?: any;
  };
  workNumber?: string;
  mobileNumber?: string;
  image?: string;
  lastOnline?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  _count?: {
    users: number;
    teams: number;
  };
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isAdmin: boolean;
  isAgent: boolean;
  isCustomer: boolean;
  isEmployee: boolean;
  permissions?: any;
  _count?: { users: number };
}

export interface Ticket {
  id: string;
  uid: number;
  subject: string;
  issue?: string;
  status: { id: string; name: string; color: string };
  priority: { id: string; name: string; color: string };
  type?: { name: string };
  group: { name: string };
  owner: { id: string; fullname: string; image?: string };
  assignee?: { id: string; fullname: string; image?: string };
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  issue: string;
  comments: any[];
  history: any[];
  tags: string[];
  dueDate?: string;
}

export interface Conversation {
  id: string;
  isGroup: boolean;
  name?: string | null;
  members?: any[];
  partner?: {
    id: string;
    fullname: string;
    image?: string;
    lastOnline?: string;
  } | null;
  recentMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
}

export interface UserRequest {
  id: string;
  type: string;
  status: string;
  message: string;
  email: string;
  userId: string;
  user?: {
    fullname: string;
    email: string;
  };
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  unread: boolean;
  createdAt: string;
  data?: any;
}

export interface DashboardStats {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  users: number;
}

export interface RecentTicket {
  id: string;
  uid: number;
  subject: string;
  status: { name: string; color: string };
  priority: { name: string; color: string };
  owner: { fullname: string };
  createdAt: string;
}

export interface Column {
  id: string;
  name: string;
  color: string;
  tickets: Ticket[];
}
