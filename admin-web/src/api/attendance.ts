import { apiClient } from './client';
import type { AttendanceRow, SessionCorrection } from '../types/api.types';

/** month is "YYYY-MM". */
export async function getAttendance(month: string): Promise<AttendanceRow[]> {
  const { data } = await apiClient.get<AttendanceRow[]>(
    '/api/admin/attendance',
    { params: { month } }
  );
  return data;
}

export interface CorrectSessionInput {
  clockIn?: string; // "HH:mm"
  clockOut?: string;
  reason: string;
}

export async function correctSession(
  sessionId: number,
  input: CorrectSessionInput
): Promise<SessionCorrection> {
  const { data } = await apiClient.post<SessionCorrection>(
    `/api/admin/sessions/${sessionId}/correct`,
    input
  );
  return data;
}

export async function getCorrectionHistory(sessionId: number): Promise<SessionCorrection[]> {
  const { data } = await apiClient.get<SessionCorrection[]>(
    `/api/admin/sessions/${sessionId}/corrections`
  );
  return data;
}
