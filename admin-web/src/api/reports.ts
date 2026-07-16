import { apiClient } from './client';
import type { MonthlySummaryRow } from '../types/api.types';

/** month is "YYYY-MM". */
export async function getMonthlySummary(
  month: string
): Promise<MonthlySummaryRow[]> {
  const { data } = await apiClient.get<MonthlySummaryRow[]>(
    '/api/admin/reports/monthly-summary',
    { params: { month } }
  );
  return data;
}
