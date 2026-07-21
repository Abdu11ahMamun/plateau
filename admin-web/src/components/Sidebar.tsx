import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ComponentType, SVGProps } from 'react';
import { useAuthStore } from '../store/auth.store';
import { initials } from '../lib/format';
import { getLeaveRequests } from '../api/leave';
import {
  BoardIcon,
  ClipboardIcon,
  UsersIcon,
  ReportIcon,
  CalendarIcon,
  CashIcon,
  LogoutIcon,
  BriefcaseIcon,
} from './icons';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

function titleCase(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

function SoonBadge() {
  return (
    <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/50">
      Soon
    </span>
  );
}

function ComingSoonLink({ label, Icon }: { label: string; Icon: Icon }) {
  return (
    <span className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300">
      <Icon className="h-5 w-5 shrink-0" />
      {label}
      <SoonBadge />
    </span>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const name = user?.name ?? '';
  const role = user?.role ? titleCase(user.role) : '';
  // Every page in this panel maps to an OWNER/MANAGER-only backend endpoint —
  // there's no EMPLOYEE-facing surface here yet (see NotAuthorizedPage).
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const { data: leaveRequests } = useQuery({
    queryKey: ['leaveRequests'],
    queryFn: () => getLeaveRequests(),
    enabled: canManage,
  });
  const pendingLeaveCount =
    leaveRequests?.filter((r) => r.status === 'PENDING').length ?? 0;

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <aside className="flex w-56 flex-col bg-ink text-white">
      <div className="px-5 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-sage text-sm font-bold text-white">
            P
          </span>
          <span className="text-xl font-bold">Plateau</span>
        </div>
      </div>

      <div className="mx-5 border-t border-white/10" />

      <nav className="flex flex-col gap-1 px-3 py-4">
        {canManage && (
          <>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <BoardIcon className="h-5 w-5 shrink-0" />
              Live Board
            </NavLink>

            <NavLink
              to="/schedule"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <CalendarIcon className="h-5 w-5 shrink-0" />
              Schedule
            </NavLink>

            <NavLink
              to="/attendance"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <ClipboardIcon className="h-5 w-5 shrink-0" />
              Attendance
            </NavLink>

            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <ReportIcon className="h-5 w-5 shrink-0" />
              Reports
            </NavLink>

            <NavLink
              to="/employees"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              <UsersIcon className="h-5 w-5 shrink-0" />
              Employees
            </NavLink>

            <NavLink
              to="/leave"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-sage text-white'
                    : 'text-slate-300 hover:bg-white/5'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <BriefcaseIcon className="h-5 w-5 shrink-0" />
                  Leave
                  {pendingLeaveCount > 0 && (
                    <span
                      className={`ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-sage text-white'
                      }`}
                    >
                      {pendingLeaveCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          </>
        )}

        <ComingSoonLink label="Paie" Icon={CashIcon} />
      </nav>

      <div className="mt-auto">
        <div className="mx-5 border-t border-white/10" />
        <div className="flex items-center gap-3 px-5 py-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sage text-xs font-bold text-white">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="text-xs text-slate-400">{role}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Sign out"
            className="text-slate-300 transition hover:text-white"
          >
            <LogoutIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
