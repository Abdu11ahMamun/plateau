import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar on desktop; hidden on mobile in favour of the bottom nav. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 overflow-y-auto">
        {/* pb-24 on mobile keeps content clear of the fixed bottom nav. */}
        <div className="mx-auto max-w-5xl p-6 pb-24 md:p-8">
          <Outlet />
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
