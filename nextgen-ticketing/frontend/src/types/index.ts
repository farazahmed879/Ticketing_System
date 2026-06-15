export interface User {
  id: string;
  fullname: string;
  email: string;
  companyEmail?: string;
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
  leaves?: number;
  image?: string;
  lastOnline?: string;
  createdAt?: string;
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
  teamLeadId?: string;
  teamLead?: { id: string; fullname: string; image?: string };
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
  managerId?: string;
  manager?: { id: string; fullname: string; image?: string };
  teamIds?: string[];
  teams?: { id: string; name: string }[];
  tickets?: {
    id: string;
    uid: number;
    subject: string;
    createdAt: string;
    status?: { id: string; name: string; color?: string };
    priority?: { id: string; name: string; color?: string };
    owner?: { id: string; fullname: string; image?: string };
    assignee?: { id: string; fullname: string; image?: string };
  }[];
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
  group?: { id: string; name: string };
  project?: { id: string; name: string };
  attachments?: string[];
  owner: { id: string; fullname: string; image?: string };
  assignee?: { id: string; fullname: string; image?: string };
  qaId?: string;
  qa?: { id: string; fullname: string; image?: string };
  createdAt: string;
  updatedAt: string;
  // Sticky flag: true if the ticket was ever moved to "Returned" (Failed).
  wasFailed?: boolean;
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
  attachments?: string[];
  senderId: string;
  createdAt: string;
  sender?: { id: string; fullname: string; image?: string };
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
  projectTickets?: number;
  projectOpenTickets?: number;
  projectResolvedTickets?: number;
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
  user?: { fullname: string; email: string; image?: string };
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
  projectId: string;
  typeId: string;
  assigneeId: string;
  dueDate?: string;
}

export interface TicketUpdateFormData {
  statusId: string;
  priorityId: string;
  assigneeId: string;
  qaId?: string;
  dueDate: string;
  issue: string;
  targetStatusName: string;
  currentStatusName: string;
  tags: string[];
}

export interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: any; // Using any for now to maintain compatibility with existing usage
  users: User[];
  qaList: User[];
  priorities: any[];
  onTicketUpdate: (body: any) => void;
}

export interface UserFormData {
  fullname: string;
  email: string;
  companyEmail?: string;
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
  leaves?: number;
  image?: string;
}

export interface ProjectFormData {
  name: string;
  description: string;
  status: string;
  clientIds: string[];
  managerId?: string;
  teamIds: string[];
}

export interface ProjectFormProps {
  initialData?: Project | null;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  clients: any[];
  managers: any[];
  teams: any[];
}

export interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  project?: Project | null;
  clients: any[];
  managers: any[];
  teams: any[];
  isLoading?: boolean;
}

export interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unreadMessageCount?: number;
}

export interface CustomerDashboardProps {
  stats: any;
  moments?: any[];
}

export interface StatsCardsProps {
  cards: any[];
}

export interface AnnouncementSectionProps {
  announcements: any[];
  t: (key: string) => string;
}

export interface SidebarDraft {
  statusId: string;
  priorityId: string;
  assigneeId: string;
  qaId: string;
  dueDate: string;
  tags: string[];
}

export interface TicketDetailSidebarProps {
  ticket: TicketDetail;
  user: any;
  statuses: any[];
  priorities: any[];
  agents: any[];
  qaList: any[];
  canUpdatePriority: boolean;
  canAssign: boolean;
  sidebarDraft: SidebarDraft;
  onSidebarDraftChange: (field: keyof SidebarDraft, value: string) => void;
  handleStartChat: (id: string) => void;
}
