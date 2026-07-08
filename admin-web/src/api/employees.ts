import { apiClient } from './client';
import type { Employee, CreateEmployeeInput } from '../types/api.types';

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
