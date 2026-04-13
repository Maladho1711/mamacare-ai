'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/auth/session';

interface UseSessionOptions {
  /** Redirige vers /login si aucune session trouvée */
  required?:     boolean;
  /** Exige un rôle précis — redirige si le rôle ne correspond pas */
  requireRole?:  'doctor' | 'patient';
}

interface UseSessionReturn {
  session: Session | null;
  loading: boolean;
}

/**
 * Hook central pour lire la session côté client.
 * Lit le cookie `mc_session` une fois au mount.
 */
export function useSession(opts: UseSessionOptions = {}): UseSessionReturn {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const found = getSession();

    if (!found) {
      if (opts.required) {
        router.replace('/login');
        return;
      }
      setLoading(false);
      return;
    }

    if (opts.requireRole && found.role !== opts.requireRole) {
      // Mauvais rôle → rediriger vers la bonne page
      router.replace(found.role === 'doctor' ? '/dashboard' : '/questionnaire');
      return;
    }

    setSession(found);
    setLoading(false);
  }, [router, opts.required, opts.requireRole]);

  return { session, loading };
}
