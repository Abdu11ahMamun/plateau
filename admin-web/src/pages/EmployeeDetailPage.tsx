import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';
import { getEmployees } from '../api/employees';
import { createContract, getContracts } from '../api/contracts';
import type { Contract, CreateContractInput, Employee } from '../types/api.types';
import {
  ROLE_STYLES,
  STATUS_STYLES,
  DeviceStatusDisplay,
  Field,
  inputClass,
} from './EmployeesPage';
import { initials, joinedDateLabel, contractDateLabel } from '../lib/format';
import { PlusIcon, XIcon, ChevronRightIcon } from '../components/icons';

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
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PersonalInfoCard employee={employee} />
            <DeviceCard employee={employee} />
          </div>
          <ContractCard employee={employee} />
        </>
      )}
    </div>
  );
}

function Header({ employee }: { employee: Employee }) {
  const role = ROLE_STYLES[employee.role];
  const status = STATUS_STYLES[employee.status];

  return (
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
    <div className="rounded-xl border border-plateau-border bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {action}
      </div>
      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-ink">{value}</p>
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
  return (
    <Card title="Device">
      <DeviceStatusDisplay employee={employee} />
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
        <div className="flex flex-wrap items-center gap-3">
          <TypeBadge type={current.type} />
          <span className="text-sm text-ink">
            {current.weeklyMinutes / 60}h/week
          </span>
          <span className="text-sm text-ink">
            {wageLabel(current.hourlyWageCents)}
          </span>
          <span className="text-sm text-slate-400">
            since {contractDateLabel(current.startDate)}
          </span>
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
    <div className="flex flex-wrap items-center gap-3 py-3 text-sm">
      <TypeBadge type={contract.type} />
      <span className="text-ink">{contract.weeklyMinutes / 60}h/week</span>
      <span className="text-ink">{wageLabel(contract.hourlyWageCents)}</span>
      <span className="text-slate-500">
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

// ── Add contract modal ──────────────────────────────────────────────────

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-plateau-border px-6 py-4">
          <h2 className="text-lg font-bold text-ink">Add contract</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-mist hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Contract['type'])}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="EXTRA">Extra</option>
            </select>
          </Field>
          <Field label="Hours per week" required>
            <input
              type="number"
              min="1"
              step="1"
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(e.target.value)}
              placeholder="20"
              className={inputClass}
            />
          </Field>
          <Field label="Hourly wage (€)" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={hourlyWage}
              onChange={(e) => setHourlyWage(e.target.value)}
              placeholder="12.31"
              className={inputClass}
            />
          </Field>
          <Field label="Start date" required>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && (
            <p className="rounded-lg bg-rouge-100 px-3 py-2 text-sm font-medium text-rouge-700">
              {error}
            </p>
          )}

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-mist"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sage-600 disabled:opacity-60"
            >
              {mutation.isPending ? 'Saving…' : 'Add contract'}
            </button>
          </div>
        </form>
      </div>
    </div>
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
    </>
  );
}
