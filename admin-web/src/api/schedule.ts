import { apiClient } from './client';
import type {
  ScheduleWeek,
  ShiftTemplate,
  UpsertShiftInput,
  WeekWithShifts,
  Shift,
} from '../types/api.types';

/** start is "YYYY-MM-DD", must be a Monday. */
export async function getWeek(start: string): Promise<WeekWithShifts> {
  const { data } = await apiClient.get<WeekWithShifts>(
    '/api/admin/schedule/week',
    { params: { start } }
  );
  return data;
}

export async function upsertShift(input: UpsertShiftInput): Promise<Shift> {
  const { data } = await apiClient.post<Shift>(
    '/api/admin/schedule/shifts',
    input
  );
  return data;
}

export async function deleteShift(id: number): Promise<void> {
  await apiClient.delete(`/api/admin/schedule/shifts/${id}`);
}

export async function publishWeek(weekId: number): Promise<ScheduleWeek> {
  const { data } = await apiClient.post<ScheduleWeek>(
    `/api/admin/schedule/week/${weekId}/publish`
  );
  return data;
}

export async function unpublishWeek(weekId: number): Promise<ScheduleWeek> {
  const { data } = await apiClient.post<ScheduleWeek>(
    `/api/admin/schedule/week/${weekId}/unpublish`
  );
  return data;
}

export async function copyWeek(
  sourceWeekStartDate: string,
  targetWeekStartDate: string
): Promise<WeekWithShifts> {
  const { data } = await apiClient.post<WeekWithShifts>(
    '/api/admin/schedule/copy',
    { sourceWeekStartDate, targetWeekStartDate }
  );
  return data;
}

export async function getShiftTemplates(): Promise<ShiftTemplate[]> {
  const { data } = await apiClient.get<ShiftTemplate[]>(
    '/api/admin/schedule/templates'
  );
  return data;
}
