'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSession } from '@/lib/auth/session';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  function handleLogout() {
    setLoading(true);
    clearSession();
    router.replace('/login');
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="text-sm text-gray-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? '...' : 'Déconnexion'}
    </button>
  );
}
