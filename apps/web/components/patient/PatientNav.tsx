'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/useSession';
import { usePatient } from '@/hooks/usePatient';
import { useNotifications, msUntilHour } from '@/hooks/useNotifications';
import { clearSession } from '@/lib/auth/session';
import { useRouter } from 'next/navigation';
import BottomNav from '@/components/shared/BottomNav';
import { ClipboardIcon, CalendarIcon, LogoutIcon, HeartIcon } from '@/components/icons';

export default function PatientNav({ children }: { children: React.ReactNode }) {
  const { session } = useSession({ required: true, requireRole: 'patient' });
  const { patient } = usePatient();
  const { permission, requestPermission, scheduleReminder, supported } = useNotifications();
  const router = useRouter();

  // Demander la permission notifications au premier chargement
  useEffect(() => {
    if (supported && permission === 'default') {
      requestPermission();
    }
  }, [supported, permission, requestPermission]);

  // Programmer les rappels quotidiens (8h et 10h)
  useEffect(() => {
    if (permission !== 'granted') return;
    scheduleReminder(msUntilHour(8, 0), 'MamaCare AI', 'Bonjour ! Remplissez votre check-up quotidien.');
    scheduleReminder(msUntilHour(10, 0), 'MamaCare AI', 'Rappel : votre questionnaire du jour attend.');
  }, [permission, scheduleReminder]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  const weekLabel =
    patient?.pregnancyWeek && patient.pregnancyWeek > 0
      ? `SA ${patient.pregnancyWeek}`
      : '';

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-pink-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/questionnaire" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#E91E8C] flex items-center justify-center">
              <HeartIcon size={18} className="text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 block leading-tight">MamaCare</span>
              {weekLabel && (
                <span className="text-[10px] font-medium text-[#E91E8C]">{weekLabel}</span>
              )}
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {session && (
              <span className="text-xs text-gray-500">{session.fullName}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogoutIcon size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenu */}
      <main className="flex-1 max-w-lg w-full mx-auto px-4 py-6 pb-24">
        {children}
      </main>

      {/* Bottom nav */}
      <BottomNav
        items={[
          { href: '/questionnaire', label: 'Check-up', icon: <ClipboardIcon size={20} /> },
          { href: '/history', label: 'Historique', icon: <CalendarIcon size={20} /> },
        ]}
      />
    </div>
  );
}
