import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  getLeaveTypes,
  getLeaveRequests,
  approveLeaveRequest,
  rejectLeaveRequest,
} from '../api/leave';
import type { LeaveRequest, LeaveStatus } from '../api/leave';
import { getEmployees } from '../api/employees';
import { initials, contractDateLabel, shortDateLabel, todayLabel } from '../lib/format';
import { getEmployeeColor } from '../lib/employeeColor';
import { EmptyState } from './AttendancePage';
import { BriefcaseIcon } from '../components/icons';

type Tab = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL';

const TABS: { value: Tab; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

const STATUS_STYLES: Record<LeaveStatus, { bg: string; label: string }> = {
  PENDING: { bg: 'bg-amber-100 text-amber-700', label: 'Pending' },
  APPROVED: { bg: 'bg-sage-100 text-sage-700', label: 'Approved' },
  REJECTED: { bg: 'bg-rouge-100 text-rouge-700', label: 'Rejected' },
  CANCELLED: { bg: 'bg-slate-100 text-slate-600', label: 'Cancelled' },
};

const EMPTY_COPY: Record<Tab, string> = {
  PENDING: 'No pending requests',
  APPROVED: 'No approved requests',
  REJECTED: 'No rejected requests',
  ALL: 'No leave requests yet',
};

function datesLabel(request: LeaveRequest): string {
  const start = contractDateLabel(request.startDate);
  const base =
    request.startDate === request.endDate
      ? start
      : `${start} → ${contractDateLabel(request.endDate)}`;
  return request.halfDay ? `${base} (${request.halfDay})` : base;
}

export default function LeaveRequestsPage() {
  const [tab, setTab] = useState<Tab>('PENDING');
  const queryClient = useQueryClient();

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: getEmployees });
  const { data: leaveTypes } = useQuery({ queryKey: ['leaveTypes'], queryFn: getLeaveTypes });
  const {
    data: requests,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['leaveRequests'], queryFn: () => getLeaveRequests() });

  const employeeMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const e of employees ?? []) m.set(e.id, e.name);
    return m;
  }, [employees]);

  const leaveTypeMap = useMemo(() => {
    const m = new Map<number, string>();
    for (const t of leaveTypes ?? []) m.set(t.id, t.name);
    return m;
  }, [leaveTypes]);

  const rows = requests ?? [];
  const pendingCount = rows.filter((r) => r.status === 'PENDING').length;

  const filtered = useMemo(() => {
    const list = tab === 'ALL' ? rows : rows.filter((r) => r.status === tab);
    return [...list].sort((a, b) => (a.requestedAt < b.requestedAt ? 1 : -1));
  }, [rows, tab]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
  }

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => approveLeaveRequest(id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Leave request approved');
    },
    onError: () => toast.error('Could not approve — try again.'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) => rejectLeaveRequest(id, note),
    onSuccess: () => {
      invalidate();
      toast.success('Leave request rejected');
    },
    onError: () => toast.error('Could not reject — try again.'),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">Leave requests</h1>
            {pendingCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sage px-1.5 text-xs font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="inline-flex w-fit items-center rounded-lg border border-plateau-border bg-white p-0.5">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === t.value ? 'bg-sage text-white' : 'text-slate-500 hover:bg-mist'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load leave requests — try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[900px]">
            <thead>
              <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Th className="min-w-[180px]">Employee</Th>
                <Th className="w-[120px]">Leave type</Th>
                <Th className="w-[190px]">Dates</Th>
                <Th className="min-w-[160px]">Reason</Th>
                <Th className="w-[120px]">Requested</Th>
                <Th className="w-[110px]">Status</Th>
                <Th className="w-[220px]">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-0">
                    <EmptyState
                      icon={<BriefcaseIcon className="h-12 w-12 text-slate-200" />}
                      title={EMPTY_COPY[tab]}
                      subtitle="Requests appear here as employees submit them."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((request) => (
                  <Row
                    key={request.id}
                    request={request}
                    employeeName={employeeMap.get(request.userId) ?? `Employee #${request.userId}`}
                    leaveTypeName={leaveTypeMap.get(request.leaveTypeId) ?? 'Leave'}
                    onApprove={(note) => approveMutation.mutate({ id: request.id, note })}
                    onReject={(note) => rejectMutation.mutate({ id: request.id, note })}
                    approving={
                      approveMutation.isPending &&
                      approveMutation.variables?.id === request.id
                    }
                    rejecting={
                      rejectMutation.isPending && rejectMutation.variables?.id === request.id
                    }
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}>
      {style.label}
    </span>
  );
}

const DECISION_TONE: Partial<Record<LeaveStatus, string>> = {
  APPROVED: 'text-sage-700',
  REJECTED: 'text-rouge-700',
};

function Row({
  request,
  employeeName,
  leaveTypeName,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  request: LeaveRequest;
  employeeName: string;
  leaveTypeName: string;
  onApprove: (note?: string) => void;
  onReject: (note: string) => void;
  approving: boolean;
  rejecting: boolean;
}) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  function closeAction() {
    setAction(null);
    setNote('');
  }

  function handleApprove() {
    onApprove(note.trim() || undefined);
    closeAction();
  }

  function handleReject() {
    if (!note.trim()) return;
    onReject(note.trim());
    closeAction();
  }

  return (
    <tr className="border-b border-plateau-border/60 align-top transition-colors duration-100 last:border-0 hover:bg-mist">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span
            style={{ backgroundColor: getEmployeeColor(request.userId) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          >
            {initials(employeeName)}
          </span>
          <span className="truncate text-sm font-medium text-ink">{employeeName}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <Badge>{leaveTypeName}</Badge>
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-ink">
        {datesLabel(request)}
      </td>
      <td className="px-5 py-3.5">
        <p className="max-w-[220px] truncate text-sm text-slate-500" title={request.reason ?? ''}>
          {request.reason || '—'}
        </p>
      </td>
      <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-500">
        Requested {shortDateLabel(request.requestedAt)}
      </td>
      <td className="px-5 py-3.5">
        <StatusBadge status={request.status} />
        {request.decisionNote && (
          <p
            className={`mt-1.5 max-w-[160px] text-xs ${DECISION_TONE[request.status] ?? 'text-slate-400'}`}
          >
            “{request.decisionNote}”
          </p>
        )}
      </td>
      <td className="px-5 py-3.5">
        {request.status !== 'PENDING' ? (
          <span className="text-sm text-slate-300">—</span>
        ) : action === null ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAction('approve')}
              className="rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setAction('reject')}
              className="rounded-lg border border-rouge/30 px-3 py-1.5 text-xs font-medium text-rouge-700 transition hover:bg-rouge-100"
            >
              Reject
            </button>
          </div>
        ) : action === 'approve' ? (
          <div className="flex flex-col gap-1.5">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full rounded-lg border border-plateau-border px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/25"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="rounded-lg bg-sage px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
              >
                {approving ? 'Approving…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={closeAction}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for rejection (required)"
              className="w-full rounded-lg border border-plateau-border px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-rouge focus:ring-2 focus:ring-rouge/25"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={rejecting || !note.trim()}
                className="rounded-lg bg-rouge px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {rejecting ? 'Rejecting…' : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={closeAction}
                className="text-xs font-medium text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i} className="h-14 border-b border-plateau-border/60">
          <td colSpan={7} className="px-5">
            <div className="h-5 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}
