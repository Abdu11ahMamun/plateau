import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AxiosError } from 'axios';
import { requestOtp, verifyOtp } from '../api/auth';
import { useAuthStore } from '../store/auth.store';

type Step = 'email' | 'code';

function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (err.code === 'ERR_NETWORK') return 'Could not reach server';
  }
  return 'Something went wrong — try again';
}

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await requestOtp(email.trim());
      setStep('code');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const res = await verifyOtp(email.trim(), code);
      setAuth(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-plateau-border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-ink text-center">Plateau</h1>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="mt-8 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">
                Email
              </label>
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="karim@example.com"
                className="w-full rounded-lg border border-plateau-border px-3 py-2 outline-none focus:ring-2 focus:ring-sage focus:border-sage"
              />
            </div>
            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="w-full rounded-lg bg-sage py-2.5 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? 'Sending…' : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            <p className="text-sm text-slate text-center">
              Code sent to <span className="font-medium text-ink">{email}</span>
            </p>
            <input
              inputMode="numeric"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              placeholder="000000"
              className="w-full rounded-lg border border-plateau-border px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:ring-2 focus:ring-sage focus:border-sage"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full rounded-lg bg-sage py-2.5 font-semibold text-white transition hover:brightness-95 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-rouge">{error}</p>
        )}
      </div>
    </div>
  );
}
