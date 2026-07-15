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
