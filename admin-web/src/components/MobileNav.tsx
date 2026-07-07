import { NavLink } from 'react-router-dom';
import { BoardIcon, UsersIcon, CashIcon } from './icons';

const itemBase =
  'flex flex-1 flex-col items-center gap-1 border-t-2 py-2 text-[11px] font-medium';

/** Bottom navigation shown only below md (the sidebar is hidden there). */
export default function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex bg-ink md:hidden">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `${itemBase} ${
            isActive
              ? 'border-sage text-sage'
              : 'border-transparent text-slate-300'
          }`
        }
      >
        <BoardIcon className="h-5 w-5" />
        Live Board
      </NavLink>

      {/* Employees / Paie land later — inert placeholders here. */}
      <span className={`${itemBase} border-transparent text-slate-300/60`}>
        <UsersIcon className="h-5 w-5" />
        Employees
      </span>
      <span className={`${itemBase} border-transparent text-slate-300/60`}>
        <CashIcon className="h-5 w-5" />
        Paie
      </span>
    </nav>
  );
}
