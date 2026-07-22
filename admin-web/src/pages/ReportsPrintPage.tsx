import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getSummary } from '../api/reports';
import { getMyTenant } from '../api/tenant';
import { totalHoursLabel, reportRangeLabel, monthEnd } from '../lib/format';

type Lang = 'en' | 'fr';

const PRINT_TEXT: Record<
  Lang,
  {
    title: string;
    employee: string;
    normal: string;
    overtime: string;
    total: string;
    flagged: string;
    totalRow: string;
    noContract: string;
    joiner: string;
  }
> = {
  en: {
    title: 'Summary',
    employee: 'Employee',
    normal: 'Normal hours',
    overtime: 'Overtime hours',
    total: 'Total hours',
    flagged: 'Flagged sessions',
    totalRow: 'Total',
    noContract: 'No contract',
    joiner: 'to',
  },
  fr: {
    title: 'Résumé',
    employee: 'Employé',
    normal: 'Heures normales',
    overtime: 'Heures supplémentaires',
    total: 'Total heures',
    flagged: 'Sessions signalées',
    totalRow: 'Total',
    noContract: 'Sans contrat',
    joiner: 'au',
  },
};

export default function ReportsPrintPage() {
  const [searchParams] = useSearchParams();
  const defaultMonth = format(new Date(), 'yyyy-MM');
  const from = searchParams.get('from') ?? `${defaultMonth}-01`;
  const to = searchParams.get('to') ?? monthEnd(defaultMonth);
  const lang: Lang = searchParams.get('lang') === 'fr' ? 'fr' : 'en';
  const t = PRINT_TEXT[lang];

  const { data, isLoading } = useQuery({
    queryKey: ['summary', from, to],
    queryFn: () => getSummary(from, to),
  });
  const { data: tenant, isLoading: tenantLoading } = useQuery({
    queryKey: ['myTenant'],
    queryFn: getMyTenant,
  });

  const rows = data ?? [];

  // Give the table a moment to paint before opening the print dialog — wait
  // for the tenant name too so the header never prints without it.
  useEffect(() => {
    if (isLoading || tenantLoading) return;
    const timer = setTimeout(() => window.print(), 300);
    return () => clearTimeout(timer);
  }, [isLoading, tenantLoading]);

  const sumNormal = rows.reduce((s, r) => s + r.normalMinutes, 0);
  const sumOvertime = rows.reduce((s, r) => s + r.overtimeMinutes, 0);
  const sumTotal = rows.reduce((s, r) => s + r.totalMinutes, 0);
  const sumFlagged = rows.reduce((s, r) => s + r.flaggedCount, 0);

  const rangeText = reportRangeLabel(from, to, {
    locale: lang === 'fr' ? fr : undefined,
    joiner: t.joiner,
  });

  return (
    <div className="mx-auto max-w-4xl bg-white p-10 text-ink">
      {/* Scoped print stylesheet — this route is print-only, no app chrome. */}
      <style>{`
        @page { margin: 14mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <header className="mb-6 border-b border-plateau-border pb-4">
        <h1 className="text-xl font-bold text-ink">
          Plateau — {t.title} — {tenant?.tenantName ?? '…'} — {rangeText}
        </h1>
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b-2 border-ink">
              <th className="py-2 pr-4 font-semibold">{t.employee}</th>
              <th className="py-2 pr-4 font-semibold">{t.normal}</th>
              <th className="py-2 pr-4 font-semibold">{t.overtime}</th>
              <th className="py-2 pr-4 font-semibold">{t.total}</th>
              <th className="py-2 font-semibold">{t.flagged}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employeeId} className="border-b border-plateau-border">
                <td className="py-2 pr-4">
                  {r.name}
                  {!r.hasContract && (
                    <span className="ml-2 text-xs text-slate-500">
                      ({t.noContract})
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">{totalHoursLabel(r.normalMinutes)}</td>
                <td className="py-2 pr-4">
                  {r.overtimeMinutes > 0
                    ? totalHoursLabel(r.overtimeMinutes)
                    : '—'}
                </td>
                <td className="py-2 pr-4">{totalHoursLabel(r.totalMinutes)}</td>
                <td className="py-2">{r.flaggedCount}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink font-semibold">
              <td className="py-2 pr-4">{t.totalRow}</td>
              <td className="py-2 pr-4">{totalHoursLabel(sumNormal)}</td>
              <td className="py-2 pr-4">
                {sumOvertime > 0 ? totalHoursLabel(sumOvertime) : '—'}
              </td>
              <td className="py-2 pr-4">{totalHoursLabel(sumTotal)}</td>
              <td className="py-2">{sumFlagged}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </div>
  );
}
