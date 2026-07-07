import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getAttendance } from '../api/attendance';
import type { AttendanceRow } from '../types/api.types';
import {
  initials,
  monthLabel,
  shiftMonth,
  attendanceDateLabel,
  durationLabel,
} from '../lib/format';

const METHOD_STYLES: Record<string, { bg: string; label: string }> = {
  NFC: { bg: 'bg-sage text-white', label: 'NFC' },
  MANUAL: { bg: 'bg-amber-100 text-amber-700', label: 'Manual' },
  ADMIN: { bg: 'bg-slate-100 text-slate-600', label: 'Admin' },
};

export default function AttendancePage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [employee, setEmployee] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance', month],
    queryFn: () => getAttendance(month),
  });

  const rows = useMemo(() => data ?? [], [data]);

  // Employee dropdown options from the loaded month.
  const employees = useMemo(() => {
    const names = new Set(rows.map((r) => r.name));
    return Array.from(names).sort();
  }, [rows]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (employee === 'ALL' || r.name === employee) &&
          (!flaggedOnly || r.flagged)
      ),
    [rows, employee, flaggedOnly]
  );

  function handleExport() {
    exportCsv(filtered, month);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Attendance</h1>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="rounded-md px-2 py-0.5 text-slate-400 transition hover:bg-mist hover:text-slate-600"
              title="Previous month"
            >
              ←
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-slate">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              className="rounded-md px-2 py-0.5 text-slate-400 transition hover:bg-mist hover:text-slate-600"
              title="Next month"
            >
              →
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-slate transition hover:bg-mist disabled:opacity-50"
        >
          Export CSV
        </button>
      </header>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={employee}
          onChange={(e) => setEmployee(e.target.value)}
          className="rounded-lg border border-plateau-border bg-white px-3 py-2 text-sm text-ink outline-none focus:border-sage focus:ring-1 focus:ring-sage"
        >
          <option value="ALL">All employees</option>
          {employees.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-plateau-border bg-white px-3 py-2 text-sm text-slate">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="accent-sage"
          />
          Flagged only
        </label>
      </div>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load attendance — try again
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-plateau-border bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-plateau-border text-xs uppercase tracking-wider text-slate-400">
              <Th>Date</Th>
              <Th>Employee</Th>
              <Th>Clock In</Th>
              <Th>Clock Out</Th>
              <Th>Duration</Th>
              <Th>Method</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No attendance records for this month
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => <Row key={`${row.userId}-${i}`} row={row} />)
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Row({ row }: { row: AttendanceRow }) {
  const method = METHOD_STYLES[row.method] ?? {
    bg: 'bg-slate-100 text-slate-600',
    label: row.method,
  };

  return (
    <tr
      className={`border-b border-plateau-border/60 transition-colors last:border-0 hover:bg-mist ${
        row.flagged ? 'bg-amber-100/40' : ''
      }`}
    >
      <td className="whitespace-nowrap px-4 py-3 text-slate">
        {attendanceDateLabel(row.date)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage text-[10px] font-bold text-white">
            {initials(row.name)}
          </span>
          <span className="font-medium text-ink">{row.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 font-mono text-ink">{row.clockIn ?? '—'}</td>
      <td className="px-4 py-3 font-mono">
        {row.clockOut ? (
          <span className="text-ink">{row.clockOut}</span>
        ) : (
          <span className="italic text-sage">Still in</span>
        )}
      </td>
      <td className="px-4 py-3 text-ink">{durationLabel(row.durationMinutes)}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${method.bg}`}
        >
          {method.label}
        </span>
      </td>
      <td className="px-4 py-3">
        <StatusCell status={row.status} />
      </td>
    </tr>
  );
}

function StatusCell({ status }: { status: string }) {
  if (status === 'FLAGGED') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
        ⚠ Flagged
      </span>
    );
  }
  if (status === 'REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rouge">
        ⚠ Review needed
      </span>
    );
  }
  // AUTO (and any other clean status) — a plain green dot.
  return (
    <span
      className="inline-block h-2.5 w-2.5 rounded-full bg-sage"
      title={status}
    />
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-plateau-border/60">
          <td colSpan={7} className="px-4 py-3">
            <div className="h-5 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}

// --- CSV export (client-side, from the currently filtered rows) ---

function exportCsv(rows: AttendanceRow[], month: string) {
  const headers = [
    'Date',
    'Employee',
    'Clock In',
    'Clock Out',
    'Duration (min)',
    'Method',
    'Status',
  ];
  const body = rows.map((r) =>
    [
      r.date,
      r.name,
      r.clockIn ?? '',
      r.clockOut ?? '',
      r.durationMinutes ?? '',
      r.method,
      r.status,
    ]
      .map(csvCell)
      .join(',')
  );
  const csv = [headers.join(','), ...body].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attendance-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
