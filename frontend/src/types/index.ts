export type UserRole = 'admin' | 'supervisor' | 'salesman';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  supervisorId: string | null;
  createdAt: string;
}

export type CompanyStatus = 'new' | 'contacted' | 'interested' | 'not_interested' | 'closed';

export interface Company {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  country: string | null;
  industry: string | null;
  status: CompanyStatus;
  assignedTo: string | null;
  assignedName: string | null;
  priorityFollowup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyHistory {
  id: string;
  companyId: string;
  changedBy: string;
  changedByName: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

export interface Note {
  id: string;
  companyId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  attachments: NoteAttachment[];
}

export interface NoteAttachment {
  id: string;
  noteId: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export type CallStatus = 'answered' | 'no_answer' | 'scheduled' | 'callback';

export interface CallLog {
  id: string;
  companyId: string;
  salesmanId: string;
  salesmanName: string;
  status: CallStatus;
  calledAt: string;
  scheduledFor: string | null;
  durationSeconds: number | null;
  shipmentCount: number | null;
  shipmentDestinations: string[] | null;
  shippingCompany: string | null;
  notes: string | null;
  createdAt: string;
}

export type ScheduledCallStatus = 'pending' | 'done' | 'cancelled';

export interface ScheduledCall {
  id: string;
  companyId: string;
  companyName: string;
  companyPhone: string | null;
  assignedTo: string;
  assignedToName: string;
  scheduledBy: string;
  scheduledFor: string;
  title: string;
  status: ScheduledCallStatus;
  createdAt: string;
}

export interface Goal {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  targetCalls: number;
  targetNewClients: number;
  targetShipments: number;
  createdBy: string;
  createdAt: string;
}

export interface UserStats {
  callsToday: number;
  callsWeek: number;
  callsMonth: number;
  callsPrevMonth: number;
  answeredMonth: number;
  noAnswerMonth: number;
  companiesAddedMonth: number;
  shipmentsMonth: number;
  dailyCalls: Array<{ date: string; count: number }>;
  currentGoal: Goal | null;
}

export interface TeamStats {
  leaderboard: LeaderboardEntry[];
  funnel: {
    new: number;
    contacted: number;
    interested: number;
    closed: number;
  };
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  callsMonth: number;
  answered: number;
  noAnswer: number;
  answerRate: number;
  newClients: number;
  shipments: number;
  goalPct: number | null;
  goal: Goal | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

export const STATUS_COLORS: Record<CompanyStatus, string> = {
  new: 'bg-indigo-100 text-indigo-800',
  contacted: 'bg-yellow-100 text-yellow-800',
  interested: 'bg-green-100 text-green-800',
  not_interested: 'bg-red-100 text-red-800',
  closed: 'bg-gray-100 text-gray-800',
};

export const STATUS_LABELS: Record<CompanyStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  interested: 'Interested',
  not_interested: 'Not Interested',
  closed: 'Closed',
};

export const CALL_STATUS_COLORS: Record<CallStatus, string> = {
  answered: 'bg-green-100 text-green-800',
  no_answer: 'bg-red-100 text-red-800',
  scheduled: 'bg-indigo-100 text-indigo-800',
  callback: 'bg-yellow-100 text-yellow-800',
};
