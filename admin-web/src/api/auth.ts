import { apiClient } from './client';
import type { AuthResponse } from '../types/api.types';

export async function requestOtp(identifier: string): Promise<void> {
  await apiClient.post('/api/auth/otp/request', { identifier });
}

export async function verifyOtp(
  identifier: string,
  code: string
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/otp/verify', {
    identifier,
    code,
  });
  return data;
}
