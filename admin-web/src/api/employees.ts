import { apiClient } from './client';
import type {
  Employee,
  CreateEmployeeInput,
  UpdateEmployeeInput,
} from '../types/api.types';

export async function getEmployees(): Promise<Employee[]> {
  const { data } = await apiClient.get<Employee[]>('/api/employees');
  return data;
}

export async function createEmployee(
  input: CreateEmployeeInput
): Promise<Employee> {
  const { data } = await apiClient.post<Employee>('/api/employees', input);
  return data;
}

export async function archiveEmployee(id: number): Promise<void> {
  await apiClient.post(`/api/employees/${id}/archive`);
}

export async function updateEmployee(
  id: number,
  input: UpdateEmployeeInput
): Promise<Employee> {
  const { data } = await apiClient.put<Employee>(`/api/employees/${id}`, input);
  return data;
}

export async function resendInvite(id: number): Promise<void> {
  await apiClient.post(`/api/employees/${id}/resend-invite`);
}
