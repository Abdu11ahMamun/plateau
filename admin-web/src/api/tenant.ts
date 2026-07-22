import { apiClient } from './client';

export interface TenantStatus {
  tenantName: string;
  employeeName: string;
  status: string;
}

export async function getMyTenant(): Promise<TenantStatus> {
  const { data } = await apiClient.get<TenantStatus>('/api/me/tenant');
  return data;
}
