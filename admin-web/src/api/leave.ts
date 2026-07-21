import { apiClient } from './client';

export interface LeaveType {
  id: number;
  name: string;
  requiresApproval: boolean;
  paid: boolean;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type HalfDay = 'AM' | 'PM';

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveTypeId: number;
  startDate: string; // "2026-07-14"
  endDate: string;
  halfDay: HalfDay | null;
  reason: string | null;
  status: LeaveStatus;
  requestedAt: string; // ISO instant
  decidedAt: string | null;
  decidedByUserId: number | null;
  decisionNote: string | null;
}

export async function getLeaveTypes(): Promise<LeaveType[]> {
  const { data } = await apiClient.get<LeaveType[]>('/api/leave/types');
  return data;
}

export async function getLeaveRequests(status?: LeaveStatus): Promise<LeaveRequest[]> {
  const { data } = await apiClient.get<LeaveRequest[]>('/api/admin/leave/requests', {
    params: status ? { status } : undefined,
  });
  return data;
}

export async function approveLeaveRequest(id: number, note?: string): Promise<LeaveRequest> {
  const { data } = await apiClient.post<LeaveRequest>(
    `/api/admin/leave/requests/${id}/approve`,
    { note }
  );
  return data;
}

export async function rejectLeaveRequest(id: number, note: string): Promise<LeaveRequest> {
  const { data } = await apiClient.post<LeaveRequest>(
    `/api/admin/leave/requests/${id}/reject`,
    { note }
  );
  return data;
}
