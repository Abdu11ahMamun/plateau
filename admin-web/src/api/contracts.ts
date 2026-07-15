import { apiClient } from './client';
import type { Contract, CreateContractInput } from '../types/api.types';

/** Wrapped response — {contract, warnings}, unlike getContracts' bare array. */
export async function createContract(
  employeeId: number,
  input: CreateContractInput
): Promise<{ contract: Contract; warnings: string[] }> {
  const { data } = await apiClient.post<{ contract: Contract; warnings: string[] }>(
    `/api/employees/${employeeId}/contract`,
    input
  );
  return data;
}

export async function getContracts(employeeId: number): Promise<Contract[]> {
  const { data } = await apiClient.get<Contract[]>(
    `/api/employees/${employeeId}/contracts`
  );
  return data;
}
