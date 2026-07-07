import { apiClient } from './client';
import type { AttendanceRow } from '../types/api.types';

/** month is "YYYY-MM". */
export async function getAttendance(month: string): Promise<AttendanceRow[]> {
  const { data } = await apiClient.get<AttendanceRow[]>(
    '/api/admin/attendance',
    { params: { month } }
  );
  return data;
}
