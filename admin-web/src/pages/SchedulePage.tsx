import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import toast from 'react-hot-toast';
import {
  getWeek,
  upsertShift,
  deleteShift,
  publishWeek,
  unpublishWeek,
  copyWeek,
  getShiftTemplates,
  markNeedsCovering,
  assignCoverer,
} from '../api/schedule';
import { getEmployees } from '../api/employees';
import type {
  Employee,
  Shift,
  ShiftStatus,
  ShiftTemplate,
  Slot,
  UpsertShiftInput,
  WeekWithShifts,
} from '../types/api.types';
import { useAuthStore } from '../store/auth.store';
import {
  initials,
  attendanceDateLabel,
  joinedDateLabel,
  shiftWeek,
  currentWeekMonday,
  hm,
  todayLabel,
} from '../lib/format';
import { IconBtn } from './AttendancePage';
import { SelectInput } from './EmployeesPage';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  CopyIcon,
  LockOpenIcon,
} from '../components/icons';

const SLOTS: Slot[] = ['M', 'S'];

/** Shift a "YYYY-MM-DD" date by a number of days (not weeks). */
function shiftDay(iso: string, days: number): string {
  return shiftWeek(iso, days / 7);
}

function shiftKey(userId: number, date: string, slot: Slot): string {
  return `${userId}_${date}_${slot}`;
}

export default function SchedulePage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [weekStart, setWeekStart] = useState(() => currentWeekMonday());
  const [popover, setPopover] = useState<{
    employee: Employee;
    date: string;
    slot: Slot;
    shift: Shift | undefined;
    top: number;
    left: number;
  } | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['schedule-week', weekStart],
    queryFn: () => getWeek(weekStart),
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['shift-templates'],
    queryFn: getShiftTemplates,
  });

  const employees = useMemo(
    () => (employeesData ?? []).filter((e) => e.status === 'ACTIVE'),
    [employeesData]
  );
  const employeeNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of employeesData ?? []) map.set(e.id, e.name);
    return map;
  }, [employeesData]);
  const templates = templatesData ?? [];
  const week = data?.week;
  const shifts = useMemo(() => data?.shifts ?? [], [data]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => shiftDay(weekStart, i)), [weekStart]);

  const shiftsByKey = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) {
      if (s.userId != null) map.set(shiftKey(s.userId, s.shiftDate, s.slot), s);
    }
    return map;
  }, [shifts]);

  // A shift marked "needs covering" has userId=null, so it drops out of
  // shiftsByKey above — it must still render on the ORIGINAL employee's row
  // (the gap in their schedule) until someone is assigned to cover it.
  const needsCoveringByKey = useMemo(() => {
    const map = new Map<string, Shift>();
    for (const s of shifts) {
      if (s.userId == null && s.status === 'OPEN' && s.coveringForUserId != null) {
        map.set(shiftKey(s.coveringForUserId, s.shiftDate, s.slot), s);
      }
    }
    return map;
  }, [shifts]);

  const isPublished = week?.status === 'PUBLISHED';
  const isOwner = currentUser?.role === 'OWNER';

  function patchWeek(updater: (old: WeekWithShifts) => WeekWithShifts) {
    queryClient.setQueryData<WeekWithShifts>(['schedule-week', weekStart], (old) =>
      old ? updater(old) : old
    );
  }

  const upsertMutation = useMutation({
    mutationFn: (input: UpsertShiftInput) => upsertShift(input),
    onSuccess: (saved) => {
      patchWeek((old) => {
        const idx = old.shifts.findIndex(
          (s) => s.userId === saved.userId && s.shiftDate === saved.shiftDate && s.slot === saved.slot
        );
        const nextShifts = [...old.shifts];
        if (idx >= 0) nextShifts[idx] = saved;
        else nextShifts.push(saved);
        return { ...old, shifts: nextShifts };
      });
      setPopover(null);
      toast.success('Shift saved');
    },
    onError: () => toast.error('Could not save shift'),
  });

  const deleteMutation = useMutation({
    mutationFn: (shiftId: number) => deleteShift(shiftId),
    onSuccess: (_data, shiftId) => {
      patchWeek((old) => ({ ...old, shifts: old.shifts.filter((s) => s.id !== shiftId) }));
      setPopover(null);
      toast.success('Shift cleared');
    },
    onError: () => toast.error('Could not clear shift'),
  });

  const markNeedsCoveringMutation = useMutation({
    mutationFn: (shiftId: number) => markNeedsCovering(shiftId),
    onSuccess: (updated) => {
      patchWeek((old) => ({
        ...old,
        shifts: old.shifts.map((s) => (s.id === updated.id ? updated : s)),
      }));
      setPopover(null);
      toast.success('Marked as needing coverage');
    },
    onError: () => toast.error('Could not mark this shift as needing coverage'),
  });

  const assignCovererMutation = useMutation({
    mutationFn: ({ shiftId, coveringUserId }: { shiftId: number; coveringUserId: number }) =>
      assignCoverer(shiftId, coveringUserId),
    onSuccess: (updated) => {
      patchWeek((old) => ({
        ...old,
        shifts: old.shifts.map((s) => (s.id === updated.id ? updated : s)),
      }));
      setPopover(null);
      toast.success('Coverer assigned');
    },
    onError: () => toast.error('Could not assign this coverer'),
  });

  const copyMutation = useMutation({
    mutationFn: () => copyWeek(shiftWeek(weekStart, -1), weekStart),
    onSuccess: (result) => {
      queryClient.setQueryData(['schedule-week', weekStart], result);
      toast.success("Last week's schedule copied");
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('This week already has shifts');
      } else if (isAxiosError(err) && err.response?.status === 404) {
        toast.error('No schedule found for last week');
      } else {
        toast.error('Could not copy last week');
      }
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => publishWeek(week!.id),
    onSuccess: (updatedWeek) => {
      patchWeek((old) => ({ ...old, week: updatedWeek }));
      toast.success('Week published');
    },
    onError: () => toast.error('Could not publish week'),
  });

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishWeek(week!.id),
    onSuccess: (updatedWeek) => {
      patchWeek((old) => ({ ...old, week: updatedWeek }));
      toast.success('Week unpublished');
    },
    onError: () => toast.error('Could not unpublish week'),
  });

  function openPopover(e: React.MouseEvent, employee: Employee, date: string, slot: Slot, shift: Shift | undefined) {
    const rect = e.currentTarget.getBoundingClientRect();
    const POPOVER_WIDTH = 280;
    const POPOVER_HEIGHT = 260;
    let top = rect.bottom + 8;
    if (top + POPOVER_HEIGHT > window.innerHeight) {
      top = Math.max(16, rect.top - POPOVER_HEIGHT - 8);
    }
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - POPOVER_WIDTH - 16);
    setPopover({ employee, date, slot, shift, top, left });
  }

  function handleCopyLastWeek() {
    if (!window.confirm("Copy last week's schedule into this week?")) return;
    copyMutation.mutate();
  }

  function handlePublish() {
    if (!window.confirm('Publish this week? Employees will be able to see it.')) return;
    publishMutation.mutate();
  }

  function handleUnpublish() {
    if (!window.confirm("Unpublish this week? You'll be able to edit it again.")) return;
    unpublishMutation.mutate();
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">Schedule</h1>
            {week && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isPublished ? 'bg-sage-100 text-sage-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isPublished ? 'Published' : 'Draft'}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <WeekSelector weekStart={weekStart} onChange={setWeekStart} />

          <button
            type="button"
            onClick={handleCopyLastWeek}
            disabled={shifts.length > 0 || copyMutation.isPending}
            className="inline-flex items-center gap-2 rounded-lg border border-plateau-border bg-white px-3 py-2 text-sm font-medium text-ink transition hover:bg-mist disabled:opacity-40"
          >
            <CopyIcon className="h-4 w-4" />
            Copy last week
          </button>

          {!isPublished && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={shifts.length === 0 || publishMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-sage px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-40"
            >
              Publish
            </button>
          )}

          {isPublished && isOwner && (
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={unpublishMutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-amber/40 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100 disabled:opacity-40"
            >
              <LockOpenIcon className="h-4 w-4" />
              Unpublish
            </button>
          )}
        </div>
      </header>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load the schedule — try again.
        </div>
      )}

      {/* Grid */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          {isLoading ? (
            <GridSkeleton />
          ) : (
            <table className="border-collapse text-left">
              <thead>
                <tr>
                  <th className="sticky left-0 z-20 w-[176px] min-w-[176px] border-b border-r border-plateau-border bg-mist/60 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    Employee
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      colSpan={2}
                      className="border-b border-l border-plateau-border bg-mist/60 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400"
                    >
                      {attendanceDateLabel(d)}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th className="sticky left-0 z-20 border-b border-r border-plateau-border bg-mist/40" />
                  {days.flatMap((d) => [
                    <th
                      key={`${d}-M`}
                      className="w-[78px] border-b border-l border-plateau-border bg-mist/40 py-1 text-center text-[10px] font-semibold text-slate-400"
                    >
                      M
                    </th>,
                    <th
                      key={`${d}-S`}
                      className="w-[78px] border-b border-plateau-border bg-mist/40 py-1 text-center text-[10px] font-semibold text-slate-400"
                    >
                      S
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={1 + days.length * 2} className="px-5 py-16 text-center text-sm text-slate-400">
                      No active employees to schedule.
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id} className="border-b border-plateau-border/60 last:border-0">
                      <td className="sticky left-0 z-10 border-r border-plateau-border bg-white px-4 py-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage-100 text-[10px] font-semibold text-sage-700">
                            {initials(employee.name)}
                          </span>
                          <span className="truncate text-sm font-medium text-ink">
                            {employee.name}
                          </span>
                        </div>
                      </td>
                      {days.flatMap((date) =>
                        SLOTS.map((slot) => {
                          const key = shiftKey(employee.id, date, slot);
                          const shift = shiftsByKey.get(key) ?? needsCoveringByKey.get(key);
                          return (
                            <td key={`${date}-${slot}`} className="border-l border-plateau-border p-0 first:border-l-0">
                              <Cell
                                shift={shift}
                                employeeNameById={employeeNameById}
                                onOpen={(e) => openPopover(e, employee, date, slot, shift)}
                              />
                            </td>
                          );
                        })
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <CellPopover
            popover={popover}
            week={week ?? null}
            templates={templates}
            employees={employees}
            saving={upsertMutation.isPending}
            deleting={deleteMutation.isPending}
            markingCovering={markNeedsCoveringMutation.isPending}
            assigning={assignCovererMutation.isPending}
            onClose={() => setPopover(null)}
            onSave={(input) => upsertMutation.mutate(input)}
            onDelete={(id) => deleteMutation.mutate(id)}
            onMarkNeedsCovering={(id) => {
              if (
                !window.confirm(
                  `Mark this shift as needing coverage? ${popover.employee.name} will be removed and this shift becomes open.`
                )
              )
                return;
              markNeedsCoveringMutation.mutate(id);
            }}
            onAssignCoverer={(id, coveringUserId) =>
              assignCovererMutation.mutate({ shiftId: id, coveringUserId })
            }
          />
        </>
      )}
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────

function WeekSelector({
  weekStart,
  onChange,
}: {
  weekStart: string;
  onChange: (w: string) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <IconBtn title="Previous week" onClick={() => onChange(shiftWeek(weekStart, -1))}>
        <ChevronLeftIcon className="h-4 w-4" />
      </IconBtn>
      <span className="min-w-[168px] text-center text-sm font-semibold text-ink">
        Week of {joinedDateLabel(weekStart)}
      </span>
      <IconBtn title="Next week" onClick={() => onChange(shiftWeek(weekStart, 1))}>
        <ChevronRightIcon className="h-4 w-4" />
      </IconBtn>
    </div>
  );
}

const DAY_OFF_HATCH = {
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(45,53,97,0.12) 0, rgba(45,53,97,0.12) 2px, transparent 2px, transparent 9px)',
};

function Cell({
  shift,
  employeeNameById,
  onOpen,
}: {
  shift: Shift | undefined;
  employeeNameById: Map<number, string>;
  onOpen: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const status = shift?.status;

  let bgClass = 'bg-white hover:bg-mist';
  let content: React.ReactNode = null;
  let style: React.CSSProperties | undefined;

  if (!shift) {
    content = (
      <PlusIcon className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100" />
    );
  } else if (status === 'SCHEDULED') {
    bgClass = 'bg-sage-100 hover:bg-sage-100/70';
    content = (
      <span className="font-mono text-[10px] font-medium text-sage-700">
        {hm(shift.startTime)}-{hm(shift.endTime)}
      </span>
    );
  } else if (status === 'DAY_OFF') {
    bgClass = 'bg-white hover:opacity-80';
    style = DAY_OFF_HATCH;
  } else if (status === 'ABSENT') {
    bgClass = 'bg-amber-100 hover:bg-amber-100/70';
    content = <span className="text-[10px] font-semibold text-amber-700">ABS</span>;
  } else if (status === 'OPEN') {
    bgClass = 'border border-dashed border-slate-300 bg-white hover:bg-mist';
    content = <span className="text-[10px] italic text-slate-400">Open</span>;
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      style={style}
      className={`group relative flex h-14 w-[78px] items-center justify-center transition ${bgClass}`}
    >
      {content}
      {shift?.covering && (
        <span
          title={
            shift.coveringForUserId != null
              ? `Covering for ${employeeNameById.get(shift.coveringForUserId) ?? 'another employee'}`
              : 'Covering'
          }
          className="absolute right-0.5 top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sage text-[8px] leading-none text-white ring-2 ring-white"
        >
          ↔
        </span>
      )}
    </button>
  );
}

const STATUS_BUTTON_ACTIVE: Record<ShiftStatus, string> = {
  SCHEDULED: 'bg-sage text-white',
  DAY_OFF: 'bg-slate-600 text-white',
  ABSENT: 'bg-amber text-white',
  OPEN: 'bg-slate-600 text-white',
};

const STATUS_BUTTON_LABEL: Record<ShiftStatus, string> = {
  SCHEDULED: 'Scheduled',
  DAY_OFF: 'Day off',
  ABSENT: 'Absent',
  OPEN: 'Open',
};

const timeInputClass =
  'h-9 w-full rounded-lg border border-plateau-border px-2 text-sm text-ink outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/25';

function CellPopover({
  popover,
  week,
  templates,
  employees,
  saving,
  deleting,
  markingCovering,
  assigning,
  onClose,
  onSave,
  onDelete,
  onMarkNeedsCovering,
  onAssignCoverer,
}: {
  popover: {
    employee: Employee;
    date: string;
    slot: Slot;
    shift: Shift | undefined;
    top: number;
    left: number;
  };
  week: { id: number; weekStartDate: string; status: string } | null;
  templates: ShiftTemplate[];
  employees: Employee[];
  saving: boolean;
  deleting: boolean;
  markingCovering: boolean;
  assigning: boolean;
  onClose: () => void;
  onSave: (input: UpsertShiftInput) => void;
  onDelete: (shiftId: number) => void;
  onMarkNeedsCovering: (shiftId: number) => void;
  onAssignCoverer: (shiftId: number, coveringUserId: number) => void;
}) {
  const { employee, date, slot, shift, top, left } = popover;
  const template = templates.find((t) => t.slot === slot);
  const isPublished = week?.status === 'PUBLISHED';

  const [status, setStatus] = useState<ShiftStatus>(shift?.status ?? 'SCHEDULED');
  const [start, setStart] = useState(hm(shift?.startTime) || hm(template?.defaultStart) || '10:00');
  const [end, setEnd] = useState(hm(shift?.endTime) || hm(template?.defaultEnd) || '18:00');
  const [coveringUserId, setCoveringUserId] = useState('');

  const slotLabel = slot === 'M' ? 'Matin' : 'Soir';

  // This shift was marked "needs covering" — it has history (coveringForUserId)
  // and no assigned employee yet. Distinct from a fresh, never-assigned Open cell.
  const needsCoverer = shift?.status === 'OPEN' && shift.coveringForUserId != null;
  // A real, currently-worked shift — the only case "Needs coverage" applies to.
  const canMarkNeedsCovering = shift?.status === 'SCHEDULED' && shift.userId != null;

  function handleSave() {
    if (!week) return;
    onSave({
      weekStartDate: week.weekStartDate,
      userId: employee.id,
      date,
      slot,
      status,
      startTime: status === 'SCHEDULED' ? start : undefined,
      endTime: status === 'SCHEDULED' ? end : undefined,
    });
  }

  return (
    <div
      style={{ top, left }}
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 w-[280px] rounded-xl border border-plateau-border bg-white p-4 shadow-xl ring-1 ring-ink/5"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-ink">{employee.name}</p>
          <p className="text-xs text-slate-400">
            {attendanceDateLabel(date)} · {slotLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium text-slate-400 hover:text-ink"
        >
          Close
        </button>
      </div>

      {needsCoverer ? (
        // Marking-needs-covering is allowed on published weeks too (a
        // real-time "called in sick" event), so this branch always wins.
        <>
          <p className="mb-3 text-xs font-medium text-amber-700">
            Needs cover for {employee.name}
          </p>
          <SelectInput
            value={coveringUserId}
            onChange={(e) => setCoveringUserId(e.target.value)}
            className="mb-3"
          >
            <option value="" disabled>
              Assign coverer…
            </option>
            {employees
              .filter((e) => e.id !== employee.id)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
          </SelectInput>
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => onAssignCoverer(shift.id, Number(coveringUserId))}
              disabled={!coveringUserId || assigning}
              className="h-8 rounded-lg bg-sage px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
            >
              {assigning ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </>
      ) : isPublished ? (
        <>
          <p className="rounded-lg bg-mist px-3 py-2 text-xs text-slate-500">
            Week is published — unpublish to edit
          </p>
          {canMarkNeedsCovering && (
            <button
              type="button"
              onClick={() => onMarkNeedsCovering(shift.id)}
              disabled={markingCovering}
              className="mt-3 text-xs font-medium text-amber-700 transition hover:text-amber-800 disabled:opacity-60"
            >
              {markingCovering ? 'Marking…' : 'Needs coverage'}
            </button>
          )}
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {(Object.keys(STATUS_BUTTON_LABEL) as ShiftStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  status === s
                    ? STATUS_BUTTON_ACTIVE[s]
                    : 'bg-mist text-slate-600 hover:bg-plateau-border/60'
                }`}
              >
                {STATUS_BUTTON_LABEL[s]}
              </button>
            ))}
          </div>

          {status === 'SCHEDULED' && (
            <div className="mb-3 flex items-center gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={timeInputClass}
              />
              <span className="text-slate-300">–</span>
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={timeInputClass}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            {shift && (
              <button
                type="button"
                onClick={() => onDelete(shift.id)}
                disabled={deleting}
                className="h-8 rounded-lg border border-plateau-border bg-white px-3 text-xs font-medium text-slate-600 transition hover:bg-mist disabled:opacity-60"
              >
                {deleting ? 'Clearing…' : 'Clear'}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="h-8 rounded-lg bg-sage px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>

          {canMarkNeedsCovering && (
            <button
              type="button"
              onClick={() => onMarkNeedsCovering(shift.id)}
              disabled={markingCovering}
              className="mt-3 text-xs font-medium text-amber-700 transition hover:text-amber-800 disabled:opacity-60"
            >
              {markingCovering ? 'Marking…' : 'Needs coverage'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-mist" />
      ))}
    </div>
  );
}
