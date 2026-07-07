import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getLiveBoard } from '../api/live';
import type { LiveBoardEntry } from '../types/api.types';

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function formatClockInTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LiveBoardPage() {
  const { data, isLoading, isError, dataUpdatedAt } = useQuery({
    queryKey: ['liveBoard'],
    queryFn: getLiveBoard,
    refetchInterval: 5000,
  });

  // "Updated Xs ago" — tick every second off the last successful fetch.
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (!dataUpdatedAt) return;
    const update = () =>
      setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  const entries = data ?? [];

  return (
    <div>
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-ink">Live Board</h1>
        {dataUpdatedAt > 0 && (
          <span className="text-sm text-slate">Updated {secondsAgo}s ago</span>
        )}
      </header>

      {isError && (
        <div className="mt-4 rounded-lg border border-amber/40 bg-amber/10 px-4 py-3 text-sm font-medium text-amber">
          Could not reach server — retrying…
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-slate">
        Clocked in now ({entries.length})
      </h2>

      {isLoading ? (
        <SkeletonGrid />
      ) : entries.length === 0 ? (
        <p className="mt-8 text-center italic text-slate">
          Nobody clocked in right now
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <EmployeeCard key={entry.userId} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmployeeCard({ entry }: { entry: LiveBoardEntry }) {
  return (
    <div className="rounded-lg border-l-4 border-sage bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sage" />
        </span>
        <span className="font-semibold text-ink">{entry.name}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm text-slate">
          Clocked in {formatDuration(entry.runningMinutes)}
        </span>
        <span className="font-mono text-sm text-slate">
          {formatClockInTime(entry.clockedInAt)}
        </span>
      </div>
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg border border-plateau-border bg-mist"
        />
      ))}
    </div>
  );
}
