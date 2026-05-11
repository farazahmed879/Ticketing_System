export interface User {
  id: string;
  fullname: string;
  email: string;
  username?: string;
  title?: string;
  role: {
    id: string;
    name: string;
    isAdmin?: boolean;
    isAgent?: boolean;
    isCustomer?: boolean;
    isEmployee?: boolean;
    isHR?: boolean;
    permissions?: any;
  };
  workNumber?: string;
  mobileNumber?: string;
  primaryContact?: string;
  secondaryContact?: string;
  cnic?: string;
  linkedInUrl?: string;
  gitUrl?: string;
  address?: string;
  emergencyContact?: string;
  primaryResumeUrl?: string;
  jpPatternResumeUrl?: string;
  nationality?: string;
  location?: string;
  employeeType?: string;
  branch?: string;
  image?: string;
  lastOnline?: string;
}

export interface Department {
  id: string;
  name: string;
  description?: string;
  teams?: Team[];
  projects?: Project[];
  _count?: {
    users: number;
    teams: number;
    projects: number;
  };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  departmentId?: string;
  department?: { id: string; name: string };
  projectIds: string[];
  projects?: { id: string; name: string }[];
  managerId?: string;
  manager?: { id: string; fullname: string; image?: string };
  memberIds: string[];
  members?: User[];
  _count?: {
    members: number;
    projects: number;
  };
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  departmentId?: string;
  department?: { id: string; name: string };
  clientIds: string[];
  clients?: { id: string; fullname: string; image?: string }[];
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isAdmin: boolean;
  isAgent: boolean;
  isCustomer: boolean;
  isEmployee: boolean;
  isHR: boolean;
  permissions?: any;
  _count?: { users: number };
}

export interface Ticket {
  dueDate: any;
  id: string;
  uid: number;
  subject: string;
  issue?: string;
  status: { id: string; name: string; color: string };
  priority: { id: string; name: string; color: string };
  type?: { id: string; name: string };
  group: { id: string; name: string };
  owner: { id: string; fullname: string; image?: string };
  assignee?: { id: string; fullname: string; image?: string };
  createdAt: string;
}

export interface TicketDetail extends Ticket {
  issue: string;
  comments: any[];
  history: any[];
  tags: string[];
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

export interface TimesheetTask {
  id: string;
  description: string;
  hours: number;
  projectId?: string;
  project?: { name: string };
  ticketId?: string;
  ticket?: { uid: number; subject: string };
}

export interface TimesheetEntry {
  id: string;
  date: string;
  totalHours: number;
  notes?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  user?: { fullname: string; email: string };
  tasks: TimesheetTask[];
  approvedBy?: { fullname: string };
}

export interface TimesheetReport {
  totalHours: number;
  approvedHours: number;
  daysCount: number;
  projectBreakdown: { name: string; hours: number }[];
  entries: TimesheetEntry[];
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone?: string;
  cnic?: string;
  address?: string;
  linkedin?: string;
  portfolio?: string;
  github?: string;
  projects?: string;
  position: string;
  resumeUrl?: string;
  notes?: string;
  objective?: string;
  technicalSkills?: string;
  workExperience?: string;
  dob?: string;
  nationality?: string;
  city?: string;
  observingSkills?: string;
  status: string;
  isConverted?: boolean;
  _count?: { interviews: number };
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPanelMember {
  id: string;
  user: {
    id: string;
    fullname: string;
    image?: string;
    email?: string;
    role?: { name: string };
  };
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  interviewerId: string;
  interviewer: {
    id: string;
    fullname: string;
    image?: string;
  };
  communicationRating: number;
  technicalRating: number;
  leadershipRating: number;
  overallRating: number;
  comments?: string;
  recommendation: string;
  createdAt: string;
}

export interface Interview {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  status: string;
  notes?: string;
  candidate: {
    id: string;
    name: string;
    email: string;
    position: string;
  };
  scheduledBy: {
    id: string;
    fullname: string;
    image?: string;
  };
  panelMembers: InterviewPanelMember[];
  feedbacks?: InterviewFeedback[];
  _count?: { feedbacks: number };
  createdAt: string;
  updatedAt: string;
}

// Common Form & UI Types
export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  image?: string;
}

export interface RoleFormData {
  name: string;
  description: string;
  isAdmin: boolean;
  isAgent: boolean;
  isCustomer: boolean;
  isEmployee: boolean;
  isHR: boolean;
  permissions: any;
}

export interface InterviewFormData {
  title: string;
  candidateId: string;
  scheduledAt: string;
  duration: string;
  location: string;
  notes: string;
  interviewerIds: string[];
}

export interface CandidateFormData {
  name: string;
  email: string;
  phone: string;
  position: string;
  resumeUrl: string;
  notes: string;
  status: string;
  countryCode: string;
  cnic: string;
  address: string;
  linkedin: string;
  portfolio: string;
  github: string;
  projects: string;
  dob: string;
  nationality: string;
  city: string;
  observingSkills?: string;
  isConverted?: boolean;
}

export interface TicketFormData {
  subject: string;
  issue: string;
  priorityId: string;
  groupId: string;
  typeId: string;
  assigneeId: string;
  dueDate?: string;
}

export interface UserFormData {
  fullname: string;
  email: string;
  password?: string;
  username?: string;
  title: string;
  roleId: string;
  primaryContact?: string;
  primaryContactCode?: string;
  secondaryContact?: string;
  secondaryContactCode?: string;
  cnic?: string;
  linkedInUrl?: string;
  gitUrl?: string;
  address?: string;
  emergencyContact?: string;
  primaryResumeUrl?: string;
  jpPatternResumeUrl?: string;
  nationality?: string;
  location?: string;
  employeeType?: string;
  branch?: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  departmentId: string;
  clientIds: string[];
}

export interface ProjectFormProps {
  initialData?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  departments: Department[];
  clients: any[]; // Using any for now to avoid circular dependency or complex imports if needed, but User is preferred
}

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  project?: Project | null;
  departments: Department[];
  clients: any[];
}

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export interface CustomerDashboardProps {
  stats: any;
}

export interface StatsCardsProps {
  cards: any[];
}

export interface AnnouncementSectionProps {
  announcements: any[];
  t: (key: string) => string;
}
