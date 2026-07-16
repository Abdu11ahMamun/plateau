export interface LiveBoardEntry {
  userId: number;
  name: string;
  role: string | null; // EMPLOYEE | MANAGER | OWNER
  clockedInAt: string; // ISO string
  runningMinutes: number;
}

export interface AttendanceRow {
  userId: number;
  name: string;
  date: string; // "2026-07-07"
  clockIn: string | null; // "09:02"
  clockOut: string | null; // "17:30" or null if still open
  durationMinutes: number | null; // null if still open
  method: string; // NFC | MANUAL | ADMIN
  status: string; // AUTO | FLAGGED | REVIEW
  flagged: boolean;
}

export interface MonthlySummaryRow {
  employeeId: number;
  name: string;
  totalMinutes: number;
  normalMinutes: number;
  overtimeMinutes: number;
  flaggedCount: number;
  hasContract: boolean;
}

export interface Contract {
  id: number;
  type: 'CDI' | 'CDD' | 'EXTRA';
  weeklyMinutes: number;
  hourlyWageCents: number;
  startDate: string; // "2026-07-01"
  endDate: string | null;
  createdAt: string;
}

export interface CreateContractInput {
  type: 'CDI' | 'CDD' | 'EXTRA';
  weeklyMinutes: number;
  hourlyWageCents: number;
  startDate: string;
  endDate?: string;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  status: 'INVITED' | 'ACTIVE' | 'ARCHIVED';
  deviceStatus: 'ACTIVE' | 'NONE';
  deviceId: number | null;
  devicePlatform: string | null;
  enrolledAt: string | null; // ISO
  currentContract: Omit<Contract, 'endDate' | 'createdAt' | 'id'> | null;
  createdAt: string; // ISO
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  role: 'EMPLOYEE' | 'MANAGER';
}

export interface UpdateEmployeeInput {
  name?: string;
  email?: string;
  role?: Employee['role'];
}

export type Slot = 'M' | 'S';
export type ShiftStatus = 'SCHEDULED' | 'DAY_OFF' | 'OPEN' | 'ABSENT';
export type WeekStatus = 'DRAFT' | 'PUBLISHED';

export interface ScheduleWeek {
  id: number;
  weekStartDate: string; // "2026-07-13", always a Monday
  status: WeekStatus;
}

export interface Shift {
  id: number;
  weekId: number;
  userId: number | null;
  shiftDate: string; // "2026-07-13"
  slot: Slot;
  startTime: string | null; // "10:00:00"
  endTime: string | null;
  breakMinutes: number | null; // explicit per-shift override, if any
  effectiveBreakMinutes: number; // computed: override -> template -> tenant default
  status: ShiftStatus;
  covering: boolean;
  coveringForUserId: number | null;
  note: string | null;
}

export interface WeekWithShifts {
  week: ScheduleWeek;
  shifts: Shift[];
}

export interface UpsertShiftInput {
  weekStartDate: string;
  userId?: number;
  date: string;
  slot: Slot;
  startTime?: string; // "HH:mm"
  endTime?: string;
  status?: ShiftStatus;
  note?: string;
  breakMinutes?: number;
}

export interface ShiftTemplate {
  id: number;
  name: string;
  slot: Slot;
  defaultStart: string; // "10:00:00"
  defaultEnd: string;
  breakMinutes: number;
}

export interface BreakDefault {
  minutes: number;
}

export interface AuthUser {
  id: number;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}
