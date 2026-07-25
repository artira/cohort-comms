'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'At least 8 characters';
  if (!/[a-z]/.test(pw)) return 'Include a lowercase letter';
  if (!/[A-Z]/.test(pw)) return 'Include an uppercase letter';
  if (!/[0-9]/.test(pw)) return 'Include a number';
  return null;
}

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'signup') {
      const pwErr = validatePassword(password);
      if (pwErr) { setError(pwErr); setLoading(false); return; }
      const { error } = await signUp(email, password, displayName || email.split('@')[0]);
      if (error) { setError(error); setLoading(false); return; }
    }

    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.includes('rate') || err.includes('limit') ? 'Too many attempts — wait a moment.' : err);
      setLoading(false);
      return;
    }
    router.push('/chat');
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">💬</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Cohort Comms</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {mode === 'signin' ? 'Sign in to chat' : 'Join the conversation'}
          </p>
        </div>

        <div className="rounded-2xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {error && (
            <div className="mb-4 text-sm px-3 py-2 rounded-lg" style={{ background: '#2a1515', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Display name</label>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                  style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  placeholder="Your name" />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Password</label>
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border text-sm outline-none focus:ring-2 focus:ring-purple-500/30"
                style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: 'var(--gradient-1)' }}>
              {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
              className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
