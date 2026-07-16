import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { getMonthlySummary } from '../api/reports';
import type { MonthlySummaryRow } from '../types/api.types';
import { initials, monthLabel, totalHoursLabel, todayLabel } from '../lib/format';
import { MonthSelector, EmptyState, csvCell } from './AttendancePage';
import {
  CalendarIcon,
  DownloadIcon,
  PrinterIcon,
} from '../components/icons';

type Lang = 'en' | 'fr';

const REPORT_HEADERS: Record<Lang, string[]> = {
  en: ['Employee', 'Normal hours', 'Overtime hours', 'Total hours', 'Flagged sessions'],
  fr: ['Employé', 'Heures normales', 'Heures supplémentaires', 'Total heures', 'Sessions signalées'],
};

export default function ReportsPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [lang, setLang] = useState<Lang>('en');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['monthly-summary', month],
    queryFn: () => getMonthlySummary(month),
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

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Monthly summary</h1>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector month={month} onChange={setMonth} />
          <LanguageToggle lang={lang} onChange={setLang} />
          <button
            type="button"
            onClick={() => exportCsv(rows, month, lang)}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
          >
            <DownloadIcon className="h-4 w-4" />
            Download CSV
          </button>
          <button
            type="button"
            onClick={() =>
              window.open(`/reports/print?month=${month}&lang=${lang}`, '_blank')
            }
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-50"
          >
            <PrinterIcon className="h-4 w-4" />
            Download PDF
          </button>
        </div>
      </header>

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
                      title={`No data for ${monthLabel(month)}`}
                      subtitle="The summary appears once employees clock in this month."
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
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">
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

function exportCsv(rows: MonthlySummaryRow[], month: string, lang: Lang) {
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
  link.download = `plateau-monthly-summary-${month}-${lang}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
