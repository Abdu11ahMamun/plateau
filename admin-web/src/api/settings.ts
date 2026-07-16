import { apiClient } from './client';
import type { BreakDefault } from '../types/api.types';

export async function getBreakDefault(): Promise<BreakDefault> {
  const { data } = await apiClient.get<BreakDefault>(
    '/api/admin/settings/break-default'
  );
  return data;
}

export async function setBreakDefault(minutes: number): Promise<BreakDefault> {
  const { data } = await apiClient.put<BreakDefault>(
    '/api/admin/settings/break-default',
    { minutes }
  );
  return data;
}
