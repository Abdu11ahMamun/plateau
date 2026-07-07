import { NavLink } from 'react-router-dom';

export default function Sidebar() {
  return (
    <aside className="flex w-56 flex-col bg-ink text-white">
      <div className="px-6 py-6">
        <span className="text-xl font-bold">Plateau</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? 'bg-sage text-white'
                : 'text-white/70 hover:bg-white/5'
            }`
          }
        >
          Live Board
        </NavLink>

        {/* Employees — not built yet. */}
        <span className="flex cursor-default items-center justify-between rounded-lg px-3 py-2 text-sm font-medium text-white/40">
          Employees
          <span className="text-[10px] uppercase tracking-wide">soon</span>
        </span>
      </nav>
    </aside>
  );
}
