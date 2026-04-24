'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, type Session } from '@/lib/auth/session';

interface UseSessionOptions {
  /** Redirige vers /login si aucune session trouvée */
  required?:     boolean;
  /** Exige un rôle précis — redirige si le rôle ne correspond pas */
  requireRole?:  'doctor' | 'patient' | 'admin';
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
      // Exception : l'admin a accès à toutes les pages (dashboard médecin, etc.)
      const role: string = found.role;
      if (role !== 'admin') {
        // Mauvais rôle → rediriger vers la bonne page
        const target =
          role === 'doctor' ? '/dashboard' :
          '/questionnaire';
        router.replace(target);
        return;
      }
    }

    setSession(found);
    setLoading(false);
  }, [router, opts.required, opts.requireRole]);

  return { session, loading };
}
