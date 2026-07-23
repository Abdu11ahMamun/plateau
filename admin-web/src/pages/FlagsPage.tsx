import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getFlags, resolveFlag } from '../api/flags';
import type { FlaggedSession, FlagResolutionType } from '../api/flags';
import { initials, attendanceDateLabel, todayLabel } from '../lib/format';
import { getEmployeeColor } from '../lib/employeeColor';
import { EmptyState, MethodBadge } from './AttendancePage';
import { FlagIcon } from '../components/icons';

type Tab = 'UNRESOLVED' | 'RESOLVED' | 'ALL';

const TABS: { value: Tab; label: string }[] = [
  { value: 'UNRESOLVED', label: 'Unresolved' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'ALL', label: 'All' },
];

const EMPTY_COPY: Record<Tab, string> = {
  UNRESOLVED: 'No unresolved flags',
  RESOLVED: 'No resolved flags',
  ALL: 'No flagged sessions yet',
};

const RESOLUTION_STYLES: Record<FlagResolutionType, { bg: string; label: string }> = {
  APPROVED: { bg: 'bg-sage-100 text-sage-700', label: 'Approved' },
  REJECTED: { bg: 'bg-rouge-100 text-rouge-700', label: 'Rejected' },
};

export default function FlagsPage() {
  const [tab, setTab] = useState<Tab>('UNRESOLVED');
  const queryClient = useQueryClient();

  const {
    data: sessions,
    isLoading,
    isError,
  } = useQuery({ queryKey: ['flags'], queryFn: () => getFlags() });

  const rows = sessions ?? [];
  const unresolvedCount = rows.filter((s) => s.resolution === null).length;

  const filtered = useMemo(() => {
    if (tab === 'UNRESOLVED') return rows.filter((s) => s.resolution === null);
    if (tab === 'RESOLVED') return rows.filter((s) => s.resolution !== null);
    return rows;
  }, [rows, tab]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['flags'] });
  }

  const resolveMutation = useMutation({
    mutationFn: ({
      sessionId,
      resolution,
      note,
    }: {
      sessionId: number;
      resolution: FlagResolutionType;
      note?: string;
    }) => resolveFlag(sessionId, resolution, note),
    onSuccess: (_data, { resolution }) => {
      invalidate();
      toast.success(resolution === 'APPROVED' ? 'Flag approved' : 'Flag rejected');
    },
    onError: () => toast.error('Could not resolve this flag — try again.'),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink">Flagged sessions</h1>
            {unresolvedCount > 0 && (
              <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber px-1.5 text-xs font-semibold text-white">
                {unresolvedCount}
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
          Could not load flagged sessions — try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[900px]">
            <thead>
              <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Th className="min-w-[180px]">Employee</Th>
                <Th className="w-[190px]">Date &amp; time</Th>
                <Th className="w-[100px]">Method</Th>
                <Th className="w-[90px]">Trust</Th>
                <Th className="w-[130px]">Status</Th>
                <Th className="w-[220px]">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState
                      icon={<FlagIcon className="h-12 w-12 text-slate-200" />}
                      title={EMPTY_COPY[tab]}
                      subtitle="Sessions land here automatically when the clock-in trust score is low."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((session) => (
                  <Row
                    key={session.sessionId}
                    session={session}
                    onApprove={(note) =>
                      resolveMutation.mutate({ sessionId: session.sessionId, resolution: 'APPROVED', note })
                    }
                    onReject={(note) =>
                      resolveMutation.mutate({ sessionId: session.sessionId, resolution: 'REJECTED', note })
                    }
                    resolving={
                      resolveMutation.isPending &&
                      resolveMutation.variables?.sessionId === session.sessionId
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

function timeRangeLabel(session: FlaggedSession): React.ReactNode {
  return (
    <span className="font-mono text-sm text-ink">
      {session.clockIn ?? '—'}
      {' → '}
      {session.clockOut ? (
        session.clockOut
      ) : (
        <span className="italic text-sage">Still in</span>
      )}
    </span>
  );
}

function Row({
  session,
  onApprove,
  onReject,
  resolving,
}: {
  session: FlaggedSession;
  onApprove: (note?: string) => void;
  onReject: (note?: string) => void;
  resolving: boolean;
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
    onReject(note.trim() || undefined);
    closeAction();
  }

  return (
    <tr className="border-b border-plateau-border/60 align-top transition-colors duration-100 last:border-0 hover:bg-mist">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span
            style={{ backgroundColor: getEmployeeColor(session.userId) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          >
            {initials(session.employeeName)}
          </span>
          <span className="truncate text-sm font-medium text-ink">{session.employeeName}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-slate-400">{attendanceDateLabel(session.date)}</span>
          {timeRangeLabel(session)}
        </div>
      </td>
      <td className="px-5 py-3.5">
        <MethodBadge method={session.method ?? ''} />
      </td>
      <td className="px-5 py-3.5 text-sm text-slate-500">
        {session.trustScore != null ? `Trust: ${session.trustScore}` : '—'}
      </td>
      <td className="px-5 py-3.5">
        {session.resolution ? (
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
              RESOLUTION_STYLES[session.resolution.resolution].bg
            }`}
          >
            {RESOLUTION_STYLES[session.resolution.resolution].label}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
            ⚠ {session.status === 'REVIEW' ? 'Review' : 'Flagged'}
          </span>
        )}
      </td>
      <td className="px-5 py-3.5">
        {session.resolution ? (
          <div className="max-w-[220px] text-xs text-slate-500">
            <p>
              by <span className="font-medium text-ink">{session.resolution.resolvedByName}</span>
            </p>
            {session.resolution.note && <p className="mt-1 italic text-slate-400">“{session.resolution.note}”</p>}
          </div>
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
                disabled={resolving}
                className="rounded-lg bg-sage px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
              >
                {resolving ? 'Approving…' : 'Confirm'}
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
              placeholder="Note (optional)"
              className="w-full rounded-lg border border-plateau-border px-2.5 py-1.5 text-xs text-ink outline-none transition focus:border-rouge focus:ring-2 focus:ring-rouge/25"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReject}
                disabled={resolving}
                className="rounded-lg bg-rouge px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {resolving ? 'Rejecting…' : 'Confirm'}
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
          <td colSpan={6} className="px-5">
            <div className="h-5 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}
