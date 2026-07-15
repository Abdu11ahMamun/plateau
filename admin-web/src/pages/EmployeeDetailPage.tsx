import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import {
  getEmployees,
  updateEmployee,
  resendInvite,
} from '../api/employees';
import { createContract, getContracts } from '../api/contracts';
import { getAttendance } from '../api/attendance';
import { revokeDevice } from '../api/devices';
import type {
  AttendanceRow,
  Contract,
  CreateContractInput,
  Employee,
  UpdateEmployeeInput,
} from '../types/api.types';
import {
  ROLE_STYLES,
  STATUS_STYLES,
  DeviceStatusDisplay,
  ModalShell,
  ModalBody,
  ModalFooter,
  Field,
  SelectInput,
  inputClass,
  btnGhost,
  btnPrimary,
} from './EmployeesPage';
import { MethodBadge } from './AttendancePage';
import {
  initials,
  joinedDateLabel,
  contractDateLabel,
  attendanceDateLabel,
  durationLabel,
  totalHoursLabel,
} from '../lib/format';
import {
  PlusIcon,
  ChevronRightIcon,
  EditIcon,
  MailIcon,
} from '../components/icons';

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const employee = data?.find((e) => String(e.id) === id);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Link
        to="/employees"
        className="w-fit text-sm font-medium text-slate-500 transition hover:text-sage"
      >
        ← Employees
      </Link>

      {isLoading ? (
        <DetailSkeleton />
      ) : !employee ? (
        <NotFoundState />
      ) : (
        <>
          <Header employee={employee} />
          {employee.status === 'INVITED' && (
            <InviteBanner employee={employee} />
          )}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PersonalInfoCard employee={employee} />
            <DeviceCard employee={employee} />
          </div>
          <ContractCard employee={employee} />
          <ThisMonthCard employee={employee} />
        </>
      )}
    </div>
  );
}

function Header({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const role = ROLE_STYLES[employee.role];
  const status = STATUS_STYLES[employee.status];

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sage-100 text-lg font-semibold text-sage-700">
          {initials(employee.name)}
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-ink">{employee.name}</h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${role.bg}`}
            >
              {role.label}
            </span>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-plateau-border bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-mist hover:text-ink"
      >
        <EditIcon className="h-3.5 w-3.5" />
        Edit
      </button>

      {editOpen && (
        <EditEmployeeModal
          employee={employee}
          onClose={() => setEditOpen(false)}
          onUpdated={() =>
            queryClient.invalidateQueries({ queryKey: ['employees'] })
          }
        />
      )}
    </div>
  );
}

function InviteBanner({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => resendInvite(employee.id),
    onSuccess: () => {
      toast.success(`Invite re-sent to ${employee.email}`);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        toast.error(`${employee.name} has already joined`);
      } else {
        toast.error('Could not resend invite');
      }
    },
  });

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber/40 bg-amber-50 px-5 py-3.5">
      <p className="text-sm font-medium text-amber-700">
        Invite sent — not yet joined
      </p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
      >
        <MailIcon className="h-3.5 w-3.5" />
        {mutation.isPending ? 'Sending…' : 'Resend invite'}
      </button>
    </div>
  );
}

function EditEmployeeModal({
  employee,
  onClose,
  onUpdated,
}: {
  employee: Employee;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [role, setRole] = useState<Employee['role']>(employee.role);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: UpdateEmployeeInput) =>
      updateEmployee(employee.id, input),
    onSuccess: () => {
      onUpdated();
      onClose();
      toast.success('Employee updated');
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
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are required.');
      return;
    }

    // Partial update — only send what actually changed.
    const input: UpdateEmployeeInput = {};
    if (trimmedName !== employee.name) input.name = trimmedName;
    if (trimmedEmail !== employee.email) input.email = trimmedEmail;
    if (role !== employee.role) input.role = role;

    if (Object.keys(input).length === 0) {
      onClose();
      return;
    }
    mutation.mutate(input);
  }

  return (
    <ModalShell title="Edit employee" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Role">
            <SelectInput
              value={role}
              onChange={(e) => setRole(e.target.value as Employee['role'])}
            >
              <option value="OWNER">Owner</option>
              <option value="MANAGER">Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </SelectInput>
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
          <button
            type="submit"
            disabled={mutation.isPending}
            className={btnPrimary}
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-plateau-border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-5 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm text-ink">{value}</p>
    </div>
  );
}

function PersonalInfoCard({ employee }: { employee: Employee }) {
  return (
    <Card title="Personal information">
      <InfoRow label="Email" value={employee.email} />
      <InfoRow label="Phone" value={employee.phone || '—'} />
      <InfoRow label="Joined" value={joinedDateLabel(employee.createdAt)} />
    </Card>
  );
}

function DeviceCard({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (deviceId: number) => revokeDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Device revoked');
    },
    onError: (err) => {
      const detail = isAxiosError(err)
        ? (err.response?.data as { detail?: string } | undefined)?.detail
        : undefined;
      toast.error(detail || 'Could not revoke device');
    },
  });

  function handleRevoke() {
    if (!employee.deviceId) return;
    const confirmed = window.confirm(
      'The employee will need to re-enroll on next login. Continue?'
    );
    if (!confirmed) return;
    mutation.mutate(employee.deviceId);
  }

  return (
    <Card title="Device">
      <DeviceStatusDisplay employee={employee} />
      {employee.deviceStatus === 'ACTIVE' && (
        <button
          type="button"
          onClick={handleRevoke}
          disabled={mutation.isPending}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-rouge/30 px-3 py-1.5 text-xs font-medium text-rouge-700 transition hover:bg-rouge-100 disabled:opacity-60"
        >
          {mutation.isPending ? 'Revoking…' : 'Revoke device'}
        </button>
      )}
    </Card>
  );
}

// ── Contract card ────────────────────────────────────────────────────────

const CONTRACT_TYPE_LABELS: Record<Contract['type'], string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  EXTRA: 'Extra',
};

/** Neutral styling — deliberately not the role-badge colors, to avoid confusion. */
function TypeBadge({ type }: { type: Contract['type'] }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {CONTRACT_TYPE_LABELS[type]}
    </span>
  );
}

function wageLabel(hourlyWageCents: number): string {
  return `${(hourlyWageCents / 100).toFixed(2)}€/h`;
}

function ContractCard({ employee }: { employee: Employee }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const history = useQuery({
    queryKey: ['contracts', employee.id],
    queryFn: () => getContracts(employee.id),
    enabled: historyOpen,
  });

  function handleCreated(warnings: string[]) {
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    queryClient.invalidateQueries({ queryKey: ['contracts', employee.id] });
    toast.success('Contract added');
    for (const warning of warnings) {
      toast(warning, {
        icon: '⚠️',
        style: { background: '#FEF3C7', color: '#B45309', fontWeight: 500 },
      });
    }
  }

  const current = employee.currentContract;

  return (
    <Card
      title="Contract"
      action={
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-600"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add contract
        </button>
      }
    >
      {current ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Type
            </p>
            <p className="mt-1.5">
              <TypeBadge type={current.type} />
            </p>
          </div>
          <InfoRow label="Hours" value={`${current.weeklyMinutes / 60}h/week`} />
          <InfoRow label="Hourly wage" value={wageLabel(current.hourlyWageCents)} />
          <InfoRow label="Since" value={contractDateLabel(current.startDate)} />
        </div>
      ) : (
        <p className="text-sm text-slate-400">No contract yet</p>
      )}

      <button
        type="button"
        onClick={() => setHistoryOpen((v) => !v)}
        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-sage"
      >
        <ChevronRightIcon
          className={`h-3.5 w-3.5 transition-transform ${historyOpen ? 'rotate-90' : ''}`}
        />
        History
      </button>

      {historyOpen && (
        <div className="flex flex-col divide-y divide-plateau-border/60 border-t border-plateau-border/60">
          {history.isLoading ? (
            <HistorySkeleton />
          ) : !history.data || history.data.length === 0 ? (
            <p className="py-3 text-sm text-slate-400">No contracts yet.</p>
          ) : (
            history.data.map((contract) => (
              <HistoryRow key={contract.id} contract={contract} />
            ))
          )}
        </div>
      )}

      {modalOpen && (
        <AddContractModal
          employeeId={employee.id}
          onClose={() => setModalOpen(false)}
          onCreated={handleCreated}
        />
      )}
    </Card>
  );
}

function HistoryRow({ contract }: { contract: Contract }) {
  return (
    <div className="grid grid-cols-[3.5rem_6rem_6rem_1fr] items-center gap-3 py-3 text-sm">
      <span className="justify-self-start">
        <TypeBadge type={contract.type} />
      </span>
      <span className="tabular-nums text-ink">
        {contract.weeklyMinutes / 60}h/week
      </span>
      <span className="tabular-nums text-ink">
        {wageLabel(contract.hourlyWageCents)}
      </span>
      <span className="tabular-nums text-slate-500">
        {contractDateLabel(contract.startDate)} →{' '}
        {contract.endDate ? (
          contractDateLabel(contract.endDate)
        ) : (
          <span className="italic text-sage">ongoing</span>
        )}
      </span>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2 py-3">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-5 animate-pulse rounded bg-mist" />
      ))}
    </div>
  );
}

// ── This month (punch history) ──────────────────────────────────────────

const RECENT_LIMIT = 10;

function Chip({
  tone = 'slate',
  children,
}: {
  tone?: 'slate' | 'amber';
  children: React.ReactNode;
}) {
  const styles =
    tone === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-slate-100 text-slate-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${styles}`}
    >
      {children}
    </span>
  );
}

/** Newest first: by date desc, then by clock-in desc within the same day. */
function compareRecent(a: AttendanceRow, b: AttendanceRow): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return (b.clockIn ?? '').localeCompare(a.clockIn ?? '');
}

function ThisMonthCard({ employee }: { employee: Employee }) {
  const currentMonth = format(new Date(), 'yyyy-MM');

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', currentMonth],
    queryFn: () => getAttendance(currentMonth),
  });

  const rows = useMemo(
    () => (data ?? []).filter((r) => r.userId === employee.id),
    [data, employee.id]
  );
  const sorted = useMemo(() => [...rows].sort(compareRecent), [rows]);
  const visibleRows = sorted.slice(0, RECENT_LIMIT);
  const hasMore = sorted.length > RECENT_LIMIT;

  const totalMinutes = rows.reduce((s, r) => s + (r.durationMinutes ?? 0), 0);
  const flaggedCount = rows.filter((r) => r.flagged).length;

  return (
    <Card title="This month">
      {isLoading ? (
        <ThisMonthSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          No sessions this month
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Chip>{rows.length} sessions</Chip>
            <Chip>{totalHoursLabel(totalMinutes)} total</Chip>
            <Chip tone={flaggedCount > 0 ? 'amber' : 'slate'}>
              {flaggedCount} flagged
            </Chip>
          </div>

          <div className="overflow-hidden rounded-lg border border-plateau-border">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Clock in</th>
                  <th className="px-4 py-2.5 font-semibold">Clock out</th>
                  <th className="px-4 py-2.5 font-semibold">Duration</th>
                  <th className="px-4 py-2.5 font-semibold">Method</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row, i) => (
                  <tr
                    key={`${row.date}-${i}`}
                    className="h-12 border-b border-plateau-border/60 last:border-0"
                  >
                    <td className="whitespace-nowrap px-4 text-sm font-medium text-ink">
                      {attendanceDateLabel(row.date)}
                    </td>
                    <td className="px-4 font-mono text-sm text-ink">
                      {row.clockIn ?? '—'}
                    </td>
                    <td className="px-4 font-mono text-sm">
                      {row.clockOut ? (
                        <span className="text-ink">{row.clockOut}</span>
                      ) : (
                        <span className="italic text-sage">Still in</span>
                      )}
                    </td>
                    <td className="px-4 text-sm text-slate-600">
                      {durationLabel(row.durationMinutes)}
                    </td>
                    <td className="px-4">
                      <MethodBadge method={row.method} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <Link
              to={`/attendance?q=${encodeURIComponent(employee.name)}`}
              className="w-fit text-sm font-medium text-sage transition hover:text-sage-700"
            >
              View all in Attendance →
            </Link>
          )}
        </>
      )}
    </Card>
  );
}

function ThisMonthSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="h-6 w-24 animate-pulse rounded-full bg-mist" />
        <div className="h-6 w-28 animate-pulse rounded-full bg-mist" />
        <div className="h-6 w-20 animate-pulse rounded-full bg-mist" />
      </div>
      <div className="h-40 animate-pulse rounded-lg border border-plateau-border bg-mist" />
    </div>
  );
}

// ── Add contract modal ──────────────────────────────────────────────────

/** Text input with a quiet unit suffix (€, h) pinned inside the right edge. */
function UnitInput({
  unit,
  ...props
}: { unit: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative block">
      <input
        {...props}
        className={`${inputClass} pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
      />
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
        {unit}
      </span>
    </span>
  );
}

function AddContractModal({
  employeeId,
  onClose,
  onCreated,
}: {
  employeeId: number;
  onClose: () => void;
  onCreated: (warnings: string[]) => void;
}) {
  const [type, setType] = useState<Contract['type']>('CDI');
  const [hoursPerWeek, setHoursPerWeek] = useState('');
  const [hourlyWage, setHourlyWage] = useState('');
  const [startDate, setStartDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: CreateContractInput) => createContract(employeeId, input),
    onSuccess: ({ warnings }) => {
      onCreated(warnings);
      onClose();
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 422) {
        setError('Please check the details and try again.');
      } else {
        setError('Something went wrong — try again.');
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const hours = Number(hoursPerWeek);
    const wage = Number(hourlyWage);
    if (
      !hoursPerWeek ||
      !hourlyWage ||
      !startDate ||
      !Number.isFinite(hours) ||
      !Number.isFinite(wage) ||
      hours <= 0 ||
      wage <= 0
    ) {
      setError('Please fill in all fields with valid values.');
      return;
    }
    mutation.mutate({
      type,
      weeklyMinutes: Math.round(hours * 60),
      hourlyWageCents: Math.round(wage * 100),
      startDate,
    });
  }

  return (
    <ModalShell
      title="Add contract"
      description="Starting a new contract closes the previous one automatically."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <Field label="Type">
            <SelectInput
              value={type}
              onChange={(e) => setType(e.target.value as Contract['type'])}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="EXTRA">Extra</option>
            </SelectInput>
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hours per week">
              <UnitInput
                unit="h"
                type="number"
                min="1"
                step="1"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
                placeholder="20"
              />
            </Field>
            <Field label="Hourly wage">
              <UnitInput
                unit="€"
                type="number"
                min="0"
                step="0.01"
                value={hourlyWage}
                onChange={(e) => setHourlyWage(e.target.value)}
                placeholder="12.31"
              />
            </Field>
          </div>
          <Field label="Start date">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
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
          <button
            type="submit"
            disabled={mutation.isPending}
            className={btnPrimary}
          >
            {mutation.isPending ? 'Saving…' : 'Add contract'}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
  );
}

// ── Empty / loading states ──────────────────────────────────────────────

function NotFoundState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-plateau-border bg-white px-6 py-16 text-center">
      <p className="text-base font-semibold text-slate-600">
        Employee not found
      </p>
      <p className="text-sm text-slate-400">
        This employee may have been removed.
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-mist" />
        <div className="flex flex-col gap-2">
          <div className="h-5 w-40 animate-pulse rounded bg-mist" />
          <div className="h-4 w-24 animate-pulse rounded bg-mist" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="h-40 animate-pulse rounded-xl border border-plateau-border bg-mist" />
        <div className="h-40 animate-pulse rounded-xl border border-plateau-border bg-mist" />
      </div>
      <div className="h-32 animate-pulse rounded-xl border border-plateau-border bg-mist" />
      <div className="h-48 animate-pulse rounded-xl border border-plateau-border bg-mist" />
    </>
  );
}
