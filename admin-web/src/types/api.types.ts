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
  createdAt: string; // ISO
}

export interface CreateEmployeeInput {
  name: string;
  email: string;
  phone?: string;
  role: 'EMPLOYEE' | 'MANAGER';
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
