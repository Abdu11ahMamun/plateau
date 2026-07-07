export interface LiveBoardEntry {
  userId: number;
  name: string;
  role: string | null; // EMPLOYEE | MANAGER | OWNER
  clockedInAt: string; // ISO string
  runningMinutes: number;
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
