'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { apiClient } from '@/lib/api/client';
import { clearSession } from '@/lib/auth/session';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/shared/BottomNav';
import { ChartIcon, UsersIcon, BellIcon, LogoutIcon, HeartIcon } from '@/components/icons';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/patients', label: 'Patientes' },
  { href: '/alerts', label: 'Alertes' },
];

interface AlertApiRow {
  resolved_at: string | null;
}

export default function DoctorNav({ children }: { children: React.ReactNode }) {
  const { session, loading: sessionLoading } = useSession({ required: true, requireRole: 'doctor' });
  const pathname = usePathname();
  const router = useRouter();
  const [alertCount, setAlertCount] = useState(0);

  // Fetch unresolved alert count — une seule fois au mount, pas à chaque navigation
  useEffect(() => {
    if (sessionLoading || !session) return;
    apiClient.get<AlertApiRow[]>('/alerts')
      .then((data) => setAlertCount(data.filter((a) => !a.resolved_at).length))
      .catch(() => {});
  }, [sessionLoading, session]); // ← pathname retiré : évite 1 appel API par page visitée

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header sticky */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E91E8C] flex items-center justify-center">
              <HeartIcon size={18} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 hidden sm:block">MamaCare</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-pink-50 text-[#E91E8C]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            {session && (
              <span className="text-xs text-gray-500 hidden sm:block">
                {session.fullName}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Se d&eacute;connecter"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* Bottom nav mobile */}
      <BottomNav
        items={[
          { href: '/dashboard', label: 'Dashboard', icon: <ChartIcon size={20} /> },
          { href: '/patients', label: 'Patientes', icon: <UsersIcon size={20} /> },
          { href: '/alerts', label: 'Alertes', icon: <BellIcon size={20} />, badge: alertCount },
        ]}
      />
    </div>
  );
}
