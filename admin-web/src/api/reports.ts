import { apiClient } from './client';
import type { MonthlySummaryRow } from '../types/api.types';

/** from/to are "YYYY-MM-DD", inclusive range. */
export async function getSummary(
  from: string,
  to: string
): Promise<MonthlySummaryRow[]> {
  const { data } = await apiClient.get<MonthlySummaryRow[]>(
    '/api/admin/reports/summary',
    { params: { from, to } }
  );
  return data;
}
