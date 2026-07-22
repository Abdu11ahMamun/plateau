import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getSummary } from '../api/reports';
import type { MonthlySummaryRow } from '../types/api.types';
import { getEmployeeColor } from '../lib/employeeColor';
import {
  initials,
  totalHoursLabel,
  todayLabel,
  currentWeekMonday,
  shiftDate,
  fullDateLabel,
  monthEnd,
  reportRangeLabel,
} from '../lib/format';
import { MonthSelector, EmptyState, csvCell, IconBtn } from './AttendancePage';
import { WeekSelector } from './SchedulePage';
import {
  CalendarIcon,
  DownloadIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '../components/icons';

type Lang = 'en' | 'fr';
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

const REPORT_HEADERS: Record<Lang, string[]> = {
  en: ['Employee', 'Normal hours', 'Overtime hours', 'Total hours', 'Flagged sessions'],
  fr: ['Employé', 'Heures normales', 'Heures supplémentaires', 'Total heures', 'Sessions signalées'],
};

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

export default function ReportsPage() {
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [day, setDay] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [weekStart, setWeekStart] = useState(() => currentWeekMonday());
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [customFrom, setCustomFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [appliedCustomRange, setAppliedCustomRange] = useState(() => ({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  }));
  const [lang, setLang] = useState<Lang>('en');

  const { from, to } = useMemo(() => {
    switch (periodType) {
      case 'daily':
        return { from: day, to: day };
      case 'weekly':
        return { from: weekStart, to: shiftDate(weekStart, 6) };
      case 'monthly':
        return { from: `${month}-01`, to: monthEnd(month) };
      case 'custom':
        return appliedCustomRange;
    }
  }, [periodType, day, weekStart, month, appliedCustomRange]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['summary', from, to],
    queryFn: () => getSummary(from, to),
  });

  const rows = useMemo(() => data ?? [], [data]);

  const totals = useMemo(
    () => ({
      normal: rows.reduce((s, r) => s + r.normalMinutes, 0),
      overtime: rows.reduce((s, r) => s + r.overtimeMinutes, 0),
      total: rows.reduce((s, r) => s + r.totalMinutes, 0),
      flagged: rows.reduce((s, r) => s + r.flaggedCount, 0),
    }),
    [rows]
  );

  function handleApplyCustom() {
    if (!customFrom || !customTo || customFrom > customTo) return;
    setAppliedCustomRange({ from: customFrom, to: customTo });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Summary</h1>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LanguageToggle lang={lang} onChange={setLang} />
          <button
            type="button"
            onClick={() => exportCsv(rows, from, to, lang)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(`/reports/print?from=${from}&to=${to}&lang=${lang}`, '_blank')
            }
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

      {/* Period controls */}
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTypeToggle value={periodType} onChange={setPeriodType} />
        {periodType === 'daily' && <DaySelector day={day} onChange={setDay} />}
        {periodType === 'weekly' && (
          <WeekSelector weekStart={weekStart} onChange={setWeekStart} />
        )}
        {periodType === 'monthly' && <MonthSelector month={month} onChange={setMonth} />}
        {periodType === 'custom' && (
          <CustomRangePicker
            from={customFrom}
            to={customTo}
            onFromChange={setCustomFrom}
            onToChange={setCustomTo}
            onApply={handleApplyCustom}
          />
        )}
      </div>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load the report — try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[720px]">
            <thead>
              <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Th className="min-w-[220px]">Employee</Th>
                <Th className="w-[130px]">Normal hours</Th>
                <Th className="w-[130px]">Overtime</Th>
                <Th className="w-[130px]">Total hours</Th>
                <Th className="w-[100px]">Flagged</Th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-0">
                    <EmptyState
                      icon={<CalendarIcon className="h-12 w-12 text-slate-200" />}
                      title={`No data for ${reportRangeLabel(from, to)}`}
                      subtitle="The summary appears once employees clock in during this period."
                    />
                  </td>
                </tr>
              ) : (
                rows.map((row) => <Row key={row.employeeId} row={row} />)
              )}
            </tbody>
            {!isLoading && rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-plateau-border text-sm font-semibold text-ink">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3">{totalHoursLabel(totals.normal)}</td>
                  <td className="px-5 py-3">
                    {totals.overtime > 0 ? (
                      <span className="text-amber-700">
                        {totalHoursLabel(totals.overtime)}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">{totalHoursLabel(totals.total)}</td>
                  <td className="px-5 py-3">{totals.flagged}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function PeriodTypeToggle({
  value,
  onChange,
}: {
  value: PeriodType;
  onChange: (p: PeriodType) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-plateau-border bg-white p-0.5">
      {PERIOD_OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value
              ? 'bg-sage text-white'
              : 'text-slate-500 hover:bg-mist'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DaySelector({
  day,
  onChange,
}: {
  day: string;
  onChange: (d: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn title="Previous day" onClick={() => onChange(shiftDate(day, -1))}>
        <ChevronLeftIcon className="h-4 w-4" />
      </IconBtn>
      <span className="min-w-[168px] text-center text-sm font-semibold text-ink">
        {fullDateLabel(day)}
      </span>
      <IconBtn title="Next day" onClick={() => onChange(shiftDate(day, 1))}>
        <ChevronRightIcon className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

const dateInputClass =
  'h-9 rounded-lg border border-plateau-border px-2 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/25';

function CustomRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  onApply,
}: {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onApply: () => void;
}) {
  const invalid = !from || !to || from > to;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        From:
        <input
          type="date"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
          className={dateInputClass}
        />
      </label>
      <label className="flex items-center gap-1.5 text-sm text-slate-600">
        To:
        <input
          type="date"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
          className={dateInputClass}
        />
      </label>
      <button
        type="button"
        onClick={onApply}
        disabled={invalid}
        className="h-9 rounded-lg bg-sage px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-50"
      >
        Apply
      </button>
    </div>
  );
}

function LanguageToggle({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-plateau-border bg-white p-0.5">
      {(['en', 'fr'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => onChange(l)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium uppercase transition ${
            lang === l
              ? 'bg-sage text-white'
              : 'text-slate-500 hover:bg-mist'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function Th({
  children,
  className = '',
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-5 py-3 font-semibold ${className}`}>{children}</th>
  );
}

function Row({ row }: { row: MonthlySummaryRow }) {
  return (
    <tr className="h-14 border-b border-plateau-border/60 transition-colors duration-100 last:border-0 hover:bg-mist">
      <td className="px-5">
        <div className="flex items-center gap-3">
          <span
            style={{ backgroundColor: getEmployeeColor(row.employeeId) }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          >
            {initials(row.name)}
          </span>
          <span className="truncate text-sm font-medium text-ink">
            {row.name}
          </span>
          {!row.hasContract && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
              No contract
            </span>
          )}
        </div>
      </td>
      <td className="px-5 text-sm text-ink">
        {totalHoursLabel(row.normalMinutes)}
      </td>
      <td className="px-5 text-sm">
        {row.overtimeMinutes > 0 ? (
          <span className="font-medium text-amber-700">
            {totalHoursLabel(row.overtimeMinutes)}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-5 text-sm font-medium text-ink">
        {totalHoursLabel(row.totalMinutes)}
      </td>
      <td className="px-5">
        {row.flaggedCount > 0 ? (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            {row.flaggedCount}
          </span>
        ) : (
          <span className="text-sm text-slate-400">0</span>
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
          <td colSpan={5} className="px-5">
            <div className="h-5 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ── CSV export ───────────────────────────────────────────────────────────

function exportCsv(rows: MonthlySummaryRow[], from: string, to: string, lang: Lang) {
  const headers = REPORT_HEADERS[lang];
  const body = rows.map((r) =>
    [
      r.name,
      totalHoursLabel(r.normalMinutes),
      totalHoursLabel(r.overtimeMinutes),
      totalHoursLabel(r.totalMinutes),
      r.flaggedCount,
    ]
      .map(csvCell)
      .join(',')
  );
  const csv = [headers.join(','), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `plateau-summary-${from}-to-${to}-${lang}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
