import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getLiveBoard } from '../api/live';
import type { LiveBoardEntry } from '../types/api.types';
import {
  initials,
  liveRunningLabel,
  averageLabel,
  clockInTime,
  todayLabel,
} from '../lib/format';
import { getEmployeeColor } from '../lib/employeeColor';
import { ClockIcon, RefreshIcon } from '../components/icons';

export default function LiveBoardPage() {
  const { data, isLoading, isError, dataUpdatedAt, refetch, isFetching } =
    useQuery({
      queryKey: ['liveBoard'],
      queryFn: getLiveBoard,
      refetchInterval: 5000,
    });

  // One shared per-second clock drives both the "Updated Xs ago" label and the
  // live card timers, so they tick smoothly between the 5s data polls.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = dataUpdatedAt
    ? Math.max(0, Math.floor((now.getTime() - dataUpdatedAt) / 1000))
    : 0;

  const entries = data ?? [];
  const avg = averageLabel(entries.map((e) => e.runningMinutes));

  return (
    <div className="flex flex-col gap-6">
      <Header
        hasData={dataUpdatedAt > 0}
        secondsAgo={secondsAgo}
        onRefresh={() => refetch()}
        refreshing={isFetching}
      />

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-100 px-4 py-3 text-sm font-medium text-amber-700">
          Could not reach server — retrying…
        </div>
      )}

      <StatsRow count={entries.length} average={avg} />

      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <SectionHeader label="On shift now" />
          <span className="rounded-full bg-sage px-2 py-0.5 text-xs font-semibold text-white">
            {entries.length}
          </span>
        </div>

        {isLoading ? (
          <SkeletonGrid />
        ) : entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {entries.map((entry) => (
              <EmployeeCard key={entry.userId} entry={entry} now={now} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader label="Off duty" muted />
        <div className="rounded-xl border border-dashed border-plateau-border bg-transparent px-6 py-8 text-center text-sm text-slate-400">
          Off-duty tracking coming soon
        </div>
      </section>
    </div>
  );
}

function Header({
  hasData,
  secondsAgo,
  onRefresh,
  refreshing,
}: {
  hasData: boolean;
  secondsAgo: number;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  return (
    <header className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-ink">Live Board</h1>
        <p className="mt-0.5 text-sm text-slate">{todayLabel()}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sage px-2.5 py-1 text-xs font-semibold text-white">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
          </span>
          Live
        </span>
        {hasData && (
          <span className="text-xs text-slate-400">Updated {secondsAgo}s ago</span>
        )}
        <button
          type="button"
          onClick={onRefresh}
          title="Refresh"
          className="text-slate-400 transition hover:text-slate-600"
        >
          <RefreshIcon className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
}

function StatsRow({
  count,
  average,
}: {
  count: number;
  average: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatBox
        emoji="🟢"
        title="Clocked in now"
        value={String(count)}
        label="employees on shift"
      />
      <StatBox
        emoji="🕐"
        title="Average time"
        value={average ?? '—'}
        label="on shift today"
      />
      <StatBox
        emoji="📋"
        title="Total today"
        value="—"
        label="shifts completed"
      />
    </div>
  );
}

function StatBox({
  emoji,
  title,
  value,
  label,
}: {
  emoji: string;
  title: string;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-plateau-border bg-white p-6 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-medium text-slate">
        <span aria-hidden>{emoji}</span>
        {title}
      </p>
      <p className="mt-2 text-3xl font-bold text-sage">{value}</p>
      <p className="mt-1 text-sm text-slate-400">{label}</p>
    </div>
  );
}

const ROLE_STYLES: Record<string, string> = {
  EMPLOYEE: 'bg-slate-100 text-slate-600',
  MANAGER: 'bg-amber-100 text-amber-700',
  OWNER: 'bg-sage text-white',
};

function EmployeeCard({ entry, now }: { entry: LiveBoardEntry; now: Date }) {
  const role = entry.role;

  return (
    <div className="flex items-center gap-4 rounded-xl border-l-4 border-sage bg-white p-4 shadow-sm transition-all duration-150 hover:scale-[1.01] hover:shadow-lg">
      <span
        style={{ backgroundColor: getEmployeeColor(entry.userId) }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      >
        {initials(entry.name)}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink">
            {entry.name}
          </span>
          {role && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                ROLE_STYLES[role] ?? 'bg-slate-100 text-slate-600'
              }`}
            >
              {role}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
            <span className="relative inline-flex h-2 w-2 animate-pulse rounded-full bg-sage" />
          </span>
          <span className="text-xs font-medium text-sage-600">Clocked in</span>
        </div>
        <p className="mt-1 font-mono text-xs text-slate-400">
          since {clockInTime(entry.clockedInAt)}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="font-mono text-lg font-bold text-ink">
          {liveRunningLabel(entry.clockedInAt, now)}
        </p>
        <p className="text-xs text-slate-400">running</p>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  muted = false,
}: {
  label: string;
  muted?: boolean;
}) {
  return (
    <h2
      className={`text-sm font-semibold uppercase tracking-wider ${
        muted ? 'text-slate-400' : 'text-ink'
      }`}
    >
      {label}
    </h2>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-plateau-border bg-white px-6 py-16 text-center shadow-sm">
      <ClockIcon className="h-16 w-16 text-slate-200" />
      <p className="mt-2 text-lg font-semibold text-slate-600">All quiet</p>
      <p className="text-sm text-slate-400">No one is clocked in right now</p>
      <p className="text-xs text-slate-300">
        The board updates automatically every 5 seconds
      </p>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-plateau-border bg-mist"
        />
      ))}
    </div>
  );
}
