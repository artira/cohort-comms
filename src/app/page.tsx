'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading) router.replace(user ? '/chat' : '/auth');
  }, [user, loading, router]);
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</div>
    </div>
  );
}
