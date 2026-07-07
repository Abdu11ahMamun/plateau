export interface LiveBoardEntry {
  userId: number;
  name: string;
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
