import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import {
  getEmployees,
  createEmployee,
  archiveEmployee,
} from '../api/employees';
import type { Employee, CreateEmployeeInput } from '../types/api.types';
import { initials, shortDateLabel, joinedDateLabel, todayLabel } from '../lib/format';
import {
  UsersIcon,
  DeviceIcon,
  PlusIcon,
  ArchiveIcon,
  XIcon,
  ChevronUpDownIcon,
} from '../components/icons';

// Exported so EmployeeDetailPage can render identical badges/status.
export const ROLE_STYLES: Record<Employee['role'], { bg: string; label: string }> = {
  OWNER: { bg: 'bg-sage-100 text-sage-700', label: 'Owner' },
  MANAGER: { bg: 'bg-amber-100 text-amber-700', label: 'Manager' },
  EMPLOYEE: { bg: 'bg-slate-100 text-slate-600', label: 'Employee' },
};

export const STATUS_STYLES: Record<Employee['status'], { dot: string; label: string }> = {
  ACTIVE: { dot: 'bg-sage', label: 'Active' },
  INVITED: { dot: 'bg-amber', label: 'Invite sent' },
  ARCHIVED: { dot: 'bg-slate-300', label: 'Archived' },
};

/** "ANDROID" → "Android". */
function platformLabel(platform: string | null): string {
  if (!platform) return '';
  return platform[0].toUpperCase() + platform.slice(1).toLowerCase();
}

/** Device column content — reused as-is on the employee detail page. */
export function DeviceStatusDisplay({
  employee,
}: {
  employee: Pick<Employee, 'deviceStatus' | 'devicePlatform' | 'enrolledAt'>;
}) {
  if (employee.deviceStatus !== 'ACTIVE') {
    return <span className="text-xs italic text-slate-300">Not enrolled</span>;
  }
  return (
    <div className="min-w-0">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage-700">
        <DeviceIcon className="h-4 w-4" />
        Bound
      </span>
      <p className="mt-0.5 text-xs text-slate-400">
        {platformLabel(employee.devicePlatform)}
        {employee.enrolledAt && ` • ${shortDateLabel(employee.enrolledAt)}`}
      </p>
    </div>
  );
}

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const employees = data ?? [];

  const archive = useMutation({
    mutationFn: (id: number) => archiveEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee archived');
    },
    onError: () => toast.error('Could not archive employee'),
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-ink">Employees</h1>
            {!isLoading && (
              <span className="rounded-full bg-mist px-2.5 py-0.5 text-sm font-semibold text-slate-500">
                {employees.length}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{todayLabel()}</p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-sage px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600"
        >
          <PlusIcon className="h-4 w-4" />
          Add employee
        </button>
      </header>

      {isError && (
        <div className="rounded-lg border border-amber/40 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          Could not load employees — try again.
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-plateau-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left md:min-w-[720px]">
            <thead>
              <tr className="border-b border-plateau-border bg-mist/60 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                <Th className="min-w-[200px]">Employee</Th>
                <Th className="w-[120px]">Role</Th>
                <Th className="w-[140px]">Status</Th>
                <Th className="w-[180px]">Device</Th>
                <Th className="w-[130px]">Joined</Th>
                <Th className="w-[60px]" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <SkeletonRows />
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                employees.map((e) => (
                  <Row
                    key={e.id}
                    employee={e}
                    onArchive={() => archive.mutate(e.id)}
                    archiving={archive.isPending && archive.variables === e.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <AddEmployeeModal
          onClose={() => setModalOpen(false)}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ['employees'] })
          }
        />
      )}
    </div>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────

function Row({
  employee,
  onArchive,
  archiving,
}: {
  employee: Employee;
  onArchive: () => void;
  archiving: boolean;
}) {
  const navigate = useNavigate();
  const role = ROLE_STYLES[employee.role];
  const status = STATUS_STYLES[employee.status];
  const isOwner = employee.role === 'OWNER';

  return (
    <tr
      onClick={() => navigate(`/employees/${employee.id}`)}
      className="group h-14 cursor-pointer border-b border-plateau-border/60 transition-colors duration-100 last:border-0 hover:bg-mist/60"
    >
      {/* Employee */}
      <td className="px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage-100 text-xs font-semibold text-sage-700">
            {initials(employee.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">
              {employee.name}
            </p>
            <p className="truncate text-xs text-slate-400">{employee.email}</p>
          </div>
        </div>
      </td>

      {/* Role */}
      <td className="px-5">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${role.bg}`}
        >
          {role.label}
        </span>
      </td>

      {/* Status */}
      <td className="px-5">
        <span className="inline-flex items-center gap-2 text-sm text-slate-600">
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      {/* Device */}
      <td className="px-5">
        <DeviceStatusDisplay employee={employee} />
      </td>

      {/* Joined */}
      <td className="px-5 text-sm tabular-nums text-slate-500">
        {joinedDateLabel(employee.createdAt)}
      </td>

      {/* Actions */}
      <td className="px-5 text-right">
        {!isOwner && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onArchive();
            }}
            disabled={archiving}
            title="Archive employee"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-rouge-100 hover:text-rouge-700 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
          >
            <ArchiveIcon className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

// ── Modal system (shared with EmployeeDetailPage) ─────────────────────────

export function ModalShell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-ink/5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description && (
              <p className="mt-0.5 text-sm text-slate-400">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-mist hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-t border-plateau-border/70 px-6 py-5">
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-plateau-border/70 bg-mist/40 px-6 py-4">
      {children}
    </div>
  );
}

export const btnGhost =
  'h-10 rounded-lg border border-plateau-border bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-mist';

export const btnPrimary =
  'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-sage px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60';

export const inputClass =
  'h-10 w-full rounded-lg border border-plateau-border bg-white px-3 text-sm text-ink placeholder:text-slate-300 outline-none transition focus:border-sage focus:ring-2 focus:ring-sage/25';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-slate-600">{label}</span>
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Native select dressed to match inputs, with a quiet custom chevron. */
export function SelectInput({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        {...rest}
        className={`${inputClass} cursor-pointer appearance-none pr-9 ${className}`}
      >
        {children}
      </select>
      <ChevronUpDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    </span>
  );
}

// ── Add employee modal ────────────────────────────────────────────────────

function AddEmployeeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'EMPLOYEE' | 'MANAGER'>('EMPLOYEE');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (input: CreateEmployeeInput) => createEmployee(input),
    onSuccess: (_data, input) => {
      onCreated();
      onClose();
      toast.success(`Invite sent to ${input.email}`);
    },
    onError: (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        setError('An employee with this email or phone already exists.');
      } else if (isAxiosError(err) && err.response?.status === 422) {
        setError('Please check the details and try again.');
      } else {
        setError('Something went wrong — try again.');
      }
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
    mutation.mutate({
      name: trimmedName,
      email: trimmedEmail,
      phone: phone.trim() || undefined,
      role,
    });
  }

  return (
    <ModalShell
      title="Add employee"
      description="An invitation will be sent by email."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit}>
        <ModalBody>
          <Field label="Name">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmed Ben Ali"
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ahmed@example.com"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Phone" hint="Optional">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className={inputClass}
              />
            </Field>
            <Field label="Role">
              <SelectInput
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as 'EMPLOYEE' | 'MANAGER')
                }
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
              </SelectInput>
            </Field>
          </div>

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
            {mutation.isPending ? 'Sending…' : 'Send invite'}
          </button>
        </ModalFooter>
      </form>
    </ModalShell>
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
  return (
    <th className={`px-5 py-2.5 font-semibold ${className}`}>{children}</th>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <UsersIcon className="h-12 w-12 text-slate-200" />
      <p className="mt-1 text-base font-semibold text-slate-600">
        No employees yet
      </p>
      <p className="text-sm text-slate-400">
        Add your first employee to get started.
      </p>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="h-14 border-b border-plateau-border/60">
          <td colSpan={6} className="px-5">
            <div className="h-6 animate-pulse rounded bg-mist" />
          </td>
        </tr>
      ))}
    </>
  );
}
