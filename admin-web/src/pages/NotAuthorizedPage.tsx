import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { LockOpenIcon } from '../components/icons';

export default function NotAuthorizedPage() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-plateau-border bg-white px-6 py-16 text-center">
      <LockOpenIcon className="h-12 w-12 text-slate-200" />
      <p className="mt-2 text-base font-semibold text-slate-600">
        You don't have access to this panel
      </p>
      <p className="max-w-sm text-sm text-slate-400">
        This admin panel is for owners and managers. If you think this is a
        mistake, ask your manager to check your account role.
      </p>
      <button
        type="button"
        onClick={handleLogout}
        className="mt-2 text-sm font-medium text-sage hover:text-sage-700"
      >
        Sign out
      </button>
    </div>
  );
}
