import { apiClient } from './client';

export async function revokeDevice(id: number): Promise<void> {
  await apiClient.post(`/api/devices/${id}/revoke`);
}
