import { apiClient } from './client';
import type { LiveBoardEntry } from '../types/api.types';

export async function getLiveBoard(): Promise<LiveBoardEntry[]> {
  const { data } = await apiClient.get<LiveBoardEntry[]>('/api/admin/live');
  return data;
}
