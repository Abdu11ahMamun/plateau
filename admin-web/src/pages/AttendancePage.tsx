import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { getAttendance, correctSession, getCorrectionHistory } from '../api/attendance';
import type { CorrectSessionInput } from '../api/attendance';
import type { AttendanceRow, SessionCorrection } from '../types/api.types';
import { getEmployeeColor } from '../lib/employeeColor';
import {
  initials,
  monthLabel,
  shiftMonth,
  attendanceDateLabel,
  durationLabel,
  totalHoursLabel,
  todayLabel,
  hm,
  shortDateLabel,
} from '../lib/format';
import { ModalShell, ModalBody, ModalFooter, Field, btnGhost, btnPrimary, inputClass } from './EmployeesPage';
import {
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  SearchIcon,
  DownloadIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpDownIcon,
  ArrowUpIcon,
  XIcon,
  EditIcon,
} from '../components/icons';

const PAGE_SIZE = 15;

type SortKey = 'date' | 'clockIn' | 'duration';
type SortDir = 'asc' | 'desc';
type Sort = { key: SortKey; dir: SortDir };

// Exported so EmployeeDetailPage's "This month" table uses the identical badge.
export const METHOD_STYLES: Record<string, { bg: string; label: string }> = {
  NFC: { bg: 'bg-sage-100 text-sage-700', label: 'NFC' },
  MANUAL: { bg: 'bg-amber-100 text-amber-700', label: 'Manual' },
  ADMIN: { bg: 'bg-slate-100 text-slate-600', label: 'Admin' },
};

export function MethodBadge({ method }: { method: string }) {
  const style = METHOD_STYLES[method] ?? {
    bg: 'bg-slate-100 text-slate-600',
    label: method,
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg}`}>
      {style.label}
    </span>
  );
}

export default function AttendancePage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [method, setMethod] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [sort, setSort] = useState<Sort>({ key: 'date', dir: 'desc' });
  const [page, setPage] = useState(1);
  const [correctingRow, setCorrectingRow] = useState<AttendanceRow | null>(null);
  const [historyRow, setHistoryRow] = useState<AttendanceRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['attendance', month],
    queryFn: () => getAttendance(month),
  });

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = rows.filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (method !== 'ALL' && r.method !== method) return false;
      if (status === 'CLEAN' && r.status !== 'AUTO') return false;
      if (status === 'FLAGGED' && r.status !== 'FLAGGED') return false;
      if (status === 'REVIEW' && r.status !== 'REVIEW') return false;
      if (flaggedOnly && !r.flagged) return false;
      return true;
    });
    return [...result].sort((a, b) => compareRows(a, b, sort));
  }, [rows, search, method, status, flaggedOnly, sort]);

  // Any change to what's shown resets to the first page.
  useEffect(() => {
    setPage(1);
  }, [search, method, status, flaggedOnly, sort, month]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Summary is for the whole month, independent of filters.
  const totalMinutes = rows.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
  const flaggedCount = rows.filter((r) => r.flagged).length;

  const hasActiveFilters =
    Boolean(search) || method !== 'ALL' || status !== 'ALL' || flaggedOnly;

  function clearFilters() {
    setSearch('');
    setMethod('ALL');
    setStatus('ALL');
    setFlaggedOnly(false);
  }

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: key === 'date' ? 'desc' : 'asc' }
    );
  }

  function handleCorrected() {
    queryClient.invalidateQueries({ queryKey: ['attendance', month] });
    toast.success('Session corrected');
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Attendance</h1>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>

        <div className="flex items-center gap-2">
          <MonthSelector month={month} onChange={setMonth} />
          <button
            type="button"
            onClick={() => exportCsv(filtered, month)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Export
          </button>
        </div>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard
          icon={<CalendarIcon className="h-5 w-5 text-sage" />}
          value={String(rows.length)}
          label="sessions this month"
        />
        <SummaryCard
          icon={<ClockIcon className="h-5 w-5 text-slate-400" />}
          value={totalHoursLabel(totalMinutes)}
          label="total hours"
        />
        <SummaryCard
          icon={
            <FlagIcon
              className={`h-5 w-5 ${flaggedCount > 0 ? 'text-rouge' : 'text-slate-400'}`}
            />
          }
          value={String(flaggedCount)}
          valueClass={flaggedCount > 0 ? 'text-rouge' : 'text-ink'}
          label="flagged entries"
          onClick={flaggedCount > 0 ? () => setFlaggedOnly(true) : undefined}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-plateau-border bg-white p-3">
          <div className="relative flex-1 min-w-[200px]">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee…"
              className="w-full rounded-lg border border-plateau-border py-2 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
            />
          </div>

          <Select
            value={method}
            onChange={setMethod}
            options={[
              ['ALL', 'All methods'],
              ['NFC', 'NFC'],
              ['MANUAL', 'Manual'],
              ['ADMIN', 'Admin'],
            ]}
          />
          <Select
            value={status}
            onChange={setStatus}
            options={[
              ['ALL', 'All status'],
              ['CLEAN', 'Clean'],
              ['FLAGGED', 'Flagged'],
              ['REVIEW', 'Review needed'],
            ]}
          />

          <button
            type="button"
            onClick={() => setFlaggedOnly((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition ${
              flaggedOnly
                ? 'border-rouge bg-rouge text-white'
                : 'border-plateau-border bg-white text-slate-600 hover:bg-mist'
            }`}
          >
            <FlagIcon className="h-4 w-4" />
            Flagged only
          </button>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {search && (
              <Pill label={`“${search}”`} onClear={() => setSearch('')} />
            )}
            {method !== 'ALL' && (
              <Pill
                label={METHOD_STYLES[method]?.label ?? method}
                onClear={() => setMethod('ALL')}
              />
            )}
            {status !== 'ALL' && (
              <Pill
                label={STATUS_FILTER_LABELS[status] ?? status}
                onClear={() => setStatus('ALL')}
              />
            )}
            {flaggedOnly && (
              <Pill label="Flagged only" onClear={() => setFlaggedOnly(false)} />
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load attendance — try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[640px]">
            <thead>
              <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <SortableTh
                  label="Date"
                  active={sort.key === 'date'}
                  dir={sort.dir}
                  onClick={() => toggleSort('date')}
                  className="w-[104px] md:w-[132px]"
                />
                <Th className="min-w-[130px] md:min-w-[180px]">Employee</Th>
                <SortableTh
                  label="Clock In"
                  active={sort.key === 'clockIn'}
                  dir={sort.dir}
                  onClick={() => toggleSort('clockIn')}
                  className="hidden w-[110px] md:table-cell"
                />
                <Th className="hidden w-[110px] md:table-cell">Clock Out</Th>
                <SortableTh
                  label="Duration"
                  active={sort.key === 'duration'}
                  dir={sort.dir}
                  onClick={() => toggleSort('duration')}
                  className="w-[120px] md:hidden lg:table-cell"
                />
                <Th className="hidden w-[104px] md:table-cell">Method</Th>
                <Th className="hidden w-[120px] md:table-cell">Status</Th>
                <Th className="w-[52px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : rows.length === 0 ? (
                <EmptyRow>
                  <EmptyState
                    icon={<CalendarIcon className="h-12 w-12 text-slate-200" />}
                    title={`No attendance records for ${monthLabel(month)}`}
                    subtitle="Sessions appear here once employees clock in."
                  />
                </EmptyRow>
              ) : filtered.length === 0 ? (
                <EmptyRow>
                  <EmptyState
                    icon={<SearchIcon className="h-12 w-12 text-slate-200" />}
                    title="No sessions found"
                    subtitle="Try adjusting your filters."
                    action={
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-sm font-medium text-sage hover:text-sage-700"
                      >
                        Clear filters
                      </button>
                    }
                  />
                </EmptyRow>
              ) : (
                pageRows.map((row, i) => (
                  <Row
                    key={`${row.userId}-${row.date}-${i}`}
                    row={row}
                    onCorrect={() => setCorrectingRow(row)}
                    onViewHistory={() => setHistoryRow(row)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && filtered.length > 0 && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            total={total}
            pageSize={PAGE_SIZE}
            onPage={setPage}
          />
        )}
      </div>

      {correctingRow && (
        <CorrectSessionModal
          row={correctingRow}
          onClose={() => setCorrectingRow(null)}
          onCorrected={handleCorrected}
        />
      )}

      {historyRow && (
        <CorrectionHistoryModal row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
    </div>
  );
}

// ── Sorting ──────────────────────────────────────────────────────────────

function compareRows(a: AttendanceRow, b: AttendanceRow, sort: Sort): number {
  const dir = sort.dir === 'asc' ? 1 : -1;
  if (sort.key === 'date') {
    if (a.date !== b.date) return a.date < b.date ? -dir : dir;
    return (a.clockIn ?? '').localeCompare(b.clockIn ?? ''); // stable within a day
  }
  if (sort.key === 'clockIn') {
    return (a.clockIn ?? '').localeCompare(b.clockIn ?? '') * dir;
  }
  // duration — open sessions (null) sort as the smallest value
  const da = a.durationMinutes ?? -1;
  const db = b.durationMinutes ?? -1;
  if (da !== db) return (da - db) * dir;
  return a.date < b.date ? 1 : -1;
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  CLEAN: 'Clean',
  FLAGGED: 'Flagged',
  REVIEW: 'Review needed',
};

// ── Pieces ───────────────────────────────────────────────────────────────

// Exported so ReportsPage's header matches this one exactly.
export function MonthSelector({
  month,
  onChange,
}: {
  month: string;
  onChange: (m: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn title="Previous month" onClick={() => onChange(shiftMonth(month, -1))}>
        <ChevronLeftIcon className="h-4 w-4" />
      </IconBtn>
      <span className="min-w-[104px] text-center text-sm font-semibold text-ink">
        {monthLabel(month)}
      </span>
      <IconBtn title="Next month" onClick={() => onChange(shiftMonth(month, 1))}>
        <ChevronRightIcon className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

// Exported so ReportsPage/SchedulePage's selectors match this one exactly.
export function IconBtn({
  children,
  onClick,
  title,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-plateau-border bg-white text-ink transition hover:bg-mist disabled:cursor-default disabled:border-transparent disabled:bg-transparent disabled:text-slate-300"
    >
      {children}
    </button>
  );
}

function SummaryCard({
  icon,
  value,
  label,
  valueClass = 'text-ink',
  onClick,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  valueClass?: string;
  onClick?: () => void;
}) {
  const base =
    'flex items-center gap-3 rounded-lg border border-plateau-border bg-white px-4 py-3 text-left';
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-mist">
        {icon}
      </span>
      <span className="min-w-0">
        <span className={`block text-xl font-bold leading-tight ${valueClass}`}>
          {value}
        </span>
        <span className="block text-xs text-slate-500">{label}</span>
      </span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={`${base} transition hover:border-rouge/40 hover:bg-mist`}
    >
      {content}
    </button>
  ) : (
    <div className={base}>{content}</div>
  );
}

// Exported so EmployeesPage's filter bar matches this one exactly.
export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="min-w-[140px] cursor-pointer rounded-lg border border-plateau-border bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/40"
    >
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

export function Pill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-600">
      {label}
      <button
        type="button"
        onClick={onClear}
        className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
      >
        <XIcon className="h-3 w-3" />
      </button>
    </span>
  );
}

function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>;
}

function SortableTh({
  label,
  active,
  dir,
  onClick,
  className = '',
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-3 font-semibold ${className}`}
      aria-sort={active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={onClick}
        className={`group inline-flex items-center gap-1 uppercase tracking-wider transition ${
          active ? 'text-ink' : 'hover:text-slate-700'
        }`}
      >
        {label}
        {active ? (
          <ArrowUpIcon
            className={`h-3.5 w-3.5 transition-transform ${
              dir === 'desc' ? 'rotate-180' : ''
            }`}
          />
        ) : (
          <ChevronUpDownIcon className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
        )}
      </button>
    </th>
  );
}

function Row({
  row,
  onCorrect,
  onViewHistory,
}: {
  row: AttendanceRow;
  onCorrect: () => void;
  onViewHistory: () => void;
}) {
  return (
    <tr
      className={`group h-14 border-b border-plateau-border/60 transition-colors duration-100 last:border-0 hover:bg-mist ${
        row.flagged ? 'bg-amber-50' : ''
      }`}
    >
      <td className="whitespace-nowrap px-5 text-sm font-medium text-ink">
        {attendanceDateLabel(row.date)}
      </td>
      <td className="px-5">
        <div className="flex items-center gap-3">
          <span
            style={{ backgroundColor: getEmployeeColor(row.userId) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          >
            {initials(row.name)}
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {row.name}
          </span>
          {row.hasCorrection &&
            (row.sessionId != null ? (
              <button
                type="button"
                onClick={onViewHistory}
                title="View correction history"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-slate-200"
              >
                <EditIcon className="h-2.5 w-2.5" />
                Corrected
              </button>
            ) : (
              // sessionId isn't in this API response yet — show the fact
              // without a click handler that would 401 the whole session.
              <span
                title="History unavailable until session IDs are exposed here"
                className="inline-flex shrink-0 cursor-default items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500"
              >
                <EditIcon className="h-2.5 w-2.5" />
                Corrected
              </span>
            ))}
        </div>
      </td>
      <td className="hidden px-5 font-mono text-sm text-ink md:table-cell">
        {row.clockIn ?? '—'}
      </td>
      <td className="hidden px-5 font-mono text-sm md:table-cell">
        {row.clockOut ? (
          <span className="text-ink">{row.clockOut}</span>
        ) : (
          <span className="italic text-sage">Still in</span>
        )}
      </td>
      <td
        className={`px-5 text-sm md:hidden lg:table-cell ${
          row.durationMinutes == null ? 'text-slate-300' : 'text-slate-600'
        }`}
      >
        {durationLabel(row.durationMinutes)}
      </td>
      <td className="hidden px-5 md:table-cell">
        <MethodBadge method={row.method} />
      </td>
      <td className="hidden px-5 md:table-cell">
        <StatusCell status={row.status} />
      </td>
      <td className="px-3 text-right">
        <button
          type="button"
          onClick={onCorrect}
          disabled={row.sessionId == null}
          title={
            row.sessionId == null
              ? 'Not available until session IDs are exposed here'
              : 'Correct session'
          }
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-mist hover:text-ink focus:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300"
        >
          <EditIcon className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

function StatusCell({ status }: { status: string }) {
  if (status === 'FLAGGED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        ⚠ Flagged
      </span>
    );
  }
  if (status === 'REVIEW') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rouge-100 px-2 py-0.5 text-xs font-medium text-rouge-700">
        ● Review
      </span>
    );
  }
  return (
    <span
      className="inline-block h-2 w-2 rounded-full bg-sage"
      title="Verified"
    />
  );
}

// ── Session correction ──────────────────────────────────────────────────

const textareaClass =
  'w-full rounded-lg border border-plateau-border bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-300 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/25';

function CorrectSessionModal({
  row,
  onClose,
  onCorrected,
}: {
  row: AttendanceRow;
  onClose: () => void;
  onCorrected: () => void;
}) {
  const [clockIn, setClockIn] = useState(row.clockIn ?? '');
  const [clockOut, setClockOut] = useState(row.clockOut ?? '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: CorrectSessionInput) => correctSession(row.sessionId, input),
    onSuccess: () => {
      onCorrected();
      onClose();
    },
    onError: (err) => {
      const detail = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      setError(detail || 'Something went wrong — try again.');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!reason.trim()) {
      setError('A reason is required.');
      return;
    }
    mutation.mutate({
      clockIn: clockIn || undefined,
      clockOut: clockOut || undefined,
      reason: reason.trim(),
    });
  }

  return (
    <ModalShell
      title="Correct session"
      description={`${row.name} · ${attendanceDateLabel(row.date)}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Clock in">
              <input
                type="time"
                value={clockIn}
                onChange={(e) => setClockIn(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Clock out">
              <input
                type="time"
                value={clockOut}
                onChange={(e) => setClockOut(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Reason" hint="required">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Why is this being corrected?"
              className={textareaClass}
            />
          </Field>

          {error && (
            <p className="rounded-lg border border-rouge/20 bg-rouge-100/60 px-3 py-2 text-sm font-medium text-rouge-700">
              {error}
            </p>
          )}
        </ModalBody>

        <ModalFooter>
          <button type="button" onClick={onClose} className={btnGhost}>
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className={btnPrimary}>
            {mutation.isPending ? 'Saving…' : 'Save correction'}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}

function CorrectionHistoryModal({ row, onClose }: { row: AttendanceRow; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['correction-history', row.sessionId],
    queryFn: () => getCorrectionHistory(row.sessionId),
  });

  const corrections = data ?? [];

  return (
    <ModalShell
      title="Correction history"
      description={`${row.name} · ${attendanceDateLabel(row.date)}`}
      onClose={onClose}
    >
      <ModalBody>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-mist" />
            ))}
          </div>
        ) : isError ? (
          <p className="rounded-lg border border-rouge/20 bg-rouge-100/60 px-3 py-2 text-sm font-medium text-rouge-700">
            Could not load correction history — try again.
          </p>
        ) : corrections.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-400">No corrections recorded.</p>
        ) : (
          <div className="flex flex-col divide-y divide-plateau-border/60">
            {corrections.map((c: SessionCorrection) => (
              <div key={c.id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-ink">
                    {hm(c.originalClockIn) || '—'}–{hm(c.originalClockOut) || '—'}
                    <span className="mx-1.5 text-slate-300">→</span>
                    {hm(c.correctedClockIn) || '—'}–{hm(c.correctedClockOut) || '—'}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {shortDateLabel(c.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-slate-500">{c.reason}</p>
              </div>
            ))}
          </div>
        )}
      </ModalBody>
    </ModalShell>
  );
}

function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between border-t border-plateau-border px-5 py-3">
      <p className="text-sm text-slate-500">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{' '}
        <span className="font-medium text-ink">{total}</span> sessions
      </p>
      <div className="flex items-center gap-1.5">
        <IconBtn
          title="Previous page"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </IconBtn>
        {pageNumbers(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-sm text-slate-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${
                p === page
                  ? 'bg-sage text-white'
                  : 'border border-plateau-border bg-white text-ink hover:bg-mist'
              }`}
            >
              {p}
            </button>
          )
        )}
        <IconBtn
          title="Next page"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          <ChevronRightIcon className="h-4 w-4" />
        </IconBtn>
      </div>
    </div>
  );
}

/** Compact page list with ellipses for long ranges. */
function pageNumbers(page: number, totalPages: number): (number | '…')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | '…')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) pages.push('…');
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < totalPages - 1) pages.push('…');
  pages.push(totalPages);
  return pages;
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={8} className="p-0">
        {children}
      </td>
    </tr>
  );
}

export function EmptyState({
  icon,
  title,
  subtitle,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon}
      <p className="mt-1 text-base font-semibold text-slate-600">{title}</p>
      <p className="text-sm text-slate-400">{subtitle}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="h-14 border-b border-plateau-border/60">
          <td colSpan={8} className="px-5">
            <div className="h-5 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── CSV export (full filtered set, all pages) ────────────────────────────

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
  link.download = `plateau-attendance-${month}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
