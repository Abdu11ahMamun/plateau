import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import {
  BoardIcon,
  CalendarIcon,
  ClipboardIcon,
  ReportIcon,
  UsersIcon,
  BriefcaseIcon,
} from './icons';

const itemBase =
  'flex flex-1 flex-col items-center gap-1 border-t-2 py-2 text-[11px] font-medium';

function navClass({ isActive }: { isActive: boolean }) {
  return `${itemBase} ${
    isActive ? 'border-sage text-sage' : 'border-transparent text-slate-300'
  }`;
}

/**
 * Bottom navigation shown only below md (the sidebar is hidden there).
 * Mirrors Sidebar's nav items and role filtering — every page here is
 * OWNER/MANAGER-only, so an EMPLOYEE has nothing to navigate to yet.
 */
export default function MobileNav() {
  const user = useAuthStore((s) => s.user);
  const canManage = user?.role === 'OWNER' || user?.role === 'MANAGER';

  if (!canManage) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex bg-ink md:hidden">
      <NavLink to="/" end className={navClass}>
        <BoardIcon className="h-5 w-5" />
        Live Board
      </NavLink>

      <NavLink to="/schedule" className={navClass}>
        <CalendarIcon className="h-5 w-5" />
        Schedule
      </NavLink>

      <NavLink to="/attendance" className={navClass}>
        <ClipboardIcon className="h-5 w-5" />
        Attendance
      </NavLink>

      <NavLink to="/reports" className={navClass}>
        <ReportIcon className="h-5 w-5" />
        Reports
      </NavLink>

      <NavLink to="/employees" className={navClass}>
        <UsersIcon className="h-5 w-5" />
        Employees
      </NavLink>

      <NavLink to="/leave" className={navClass}>
        <BriefcaseIcon className="h-5 w-5" />
        Leave
      </NavLink>
    </nav>
  );
}
