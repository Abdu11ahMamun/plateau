import { apiClient } from './client';

export type FlagResolutionType = 'APPROVED' | 'REJECTED';

export interface FlagResolutionView {
  resolvedByUserId: number;
  resolvedByName: string;
  resolution: FlagResolutionType;
  note: string | null;
  resolvedAt: string; // ISO instant
}

export interface FlaggedSession {
  sessionId: number;
  userId: number;
  employeeName: string;
  date: string; // "2026-07-07"
  clockIn: string | null;
  clockOut: string | null;
  durationMinutes: number | null;
  method: string | null;
  trustScore: number | null;
  status: string; // FLAGGED | REVIEW
  resolution: FlagResolutionView | null;
}

export async function getFlags(resolved?: boolean): Promise<FlaggedSession[]> {
  const { data } = await apiClient.get<FlaggedSession[]>('/api/admin/flags', {
    params: resolved === undefined ? undefined : { resolved },
  });
  return data;
}

export async function resolveFlag(
  sessionId: number,
  resolution: FlagResolutionType,
  note?: string
): Promise<void> {
  await apiClient.post(`/api/admin/flags/${sessionId}/resolve`, { resolution, note });
}
