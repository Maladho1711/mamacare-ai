'use client';

/**
 * --- Page Profil Médecin ------------------------------------------------------
 *
 * Affiche les informations du médecin connecté, ses statistiques et les
 * actions disponibles (édition, notifications, export CSV, déconnexion).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import { clearSession } from '@/lib/auth/session';
import { apiClient } from '@/lib/api/client';
import {
  UserIcon,
  SettingsIcon,
  DownloadIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  LogoutIcon,
  BellIcon,
  PhoneIcon,
  UsersIcon,
  ClipboardIcon,
} from '@/components/icons';

// --- Types --------------------------------------------------------------------

interface ProfileStats {
  activePatients:   number;
  resolvedAlerts:   number;
  questionnaires:   number;
}

interface AlertApiRow {
  resolved_at: string | null;
  created_at:  string;
}

interface PatientApiRow {
  id: string;
}

// --- Skeleton -----------------------------------------------------------------

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-gray-200 rounded-full w-3/4" />
            <div className="h-3.5 bg-gray-200 rounded-full w-1/2" />
            <div className="h-3.5 bg-gray-200 rounded-full w-2/5" />
          </div>
        </div>
      </div>
      {/* Stats */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="h-4 bg-gray-200 rounded-full w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <div className="h-8 bg-gray-200 rounded-lg w-full" />
              <div className="h-3 bg-gray-200 rounded-full w-4/5" />
            </div>
          ))}
        </div>
      </div>
      {/* Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-gray-200" />
            <div className="h-4 bg-gray-200 rounded-full flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Composant ----------------------------------------------------------------

export default function ProfilePage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [stats,   setStats]   = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  // -- Charger les stats depuis les endpoints existants ---------------------
  useEffect(() => {
    if (sessionLoading || !session) return;
    let cancelled = false;

    (async () => {
      try {
        // Charger patientes et alertes en parallèle
        const [patients, alerts] = await Promise.allSettled([
          apiClient.get<PatientApiRow[]>('/patients'),
          apiClient.get<AlertApiRow[]>('/alerts'),
        ]);

        if (cancelled) return;

        const patientList = patients.status === 'fulfilled' ? patients.value : [];
        const alertList   = alerts.status   === 'fulfilled' ? alerts.value   : [];

        // Compter les alertes résolues ce mois
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const resolvedThisMonth = alertList.filter(
          (a) => a.resolved_at && new Date(a.resolved_at) >= firstOfMonth,
        ).length;

        // Compter les questionnaires soumis ce mois (alertes créées ce mois = proxy)
        const questionnairesThisMonth = alertList.filter(
          (a) => new Date(a.created_at) >= firstOfMonth,
        ).length;

        setStats({
          activePatients:  patientList.length,
          resolvedAlerts:  resolvedThisMonth,
          questionnaires:  questionnairesThisMonth,
        });
      } catch {
        // Stats non critiques — on affiche des zéros si erreur
        setStats({ activePatients: 0, resolvedAlerts: 0, questionnaires: 0 });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionLoading, session]);

  const handleLogout = () => {
    clearSession();
    router.replace('/login');
  };

  // -- Rendu loading --------------------------------------------------------
  if (loading || sessionLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <ProfileSkeleton />
      </div>
    );
  }

  const initials = session?.fullName
    ? session.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  // -- Paramètres — liens avec TODO flows ----------------------------------
  const settingsItems: Array<{
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
    badge?: string;
  }> = [
    {
      icon:        <UserIcon size={18} className="text-[#E91E8C]" />,
      label:       'Modifier mon profil',
      description: 'Nom, spécialité, hôpital',
      onClick:     () => { /* TODO: modale d'édition */ },
    },
    {
      icon:        <PhoneIcon size={18} className="text-green-600" />,
      label:       'Changer mon numéro WhatsApp',
      description: 'Numéro pour recevoir les alertes',
      onClick:     () => { /* TODO: modale WhatsApp */ },
    },
    {
      icon:        <BellIcon size={18} className="text-amber-500" />,
      label:       'Gérer les notifications',
      description: 'Push, WhatsApp, SMS',
      onClick:     () => router.push('/notifications'),
    },
    {
      icon:        <DownloadIcon size={18} className="text-blue-600" />,
      label:       'Exporter mes données (CSV)',
      description: 'Patientes, alertes, questionnaires',
      onClick:     () => { /* TODO: export CSV */ },
      badge:       'Bientôt',
    },
  ];

  return (
    <div className="max-w-lg mx-auto flex flex-col gap-4">

      {/* -- Bouton retour -- */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#E91E8C] transition-colors self-start"
      >
        <ArrowLeftIcon size={16} />
        Retour
      </button>

      {/* -- Carte identité -- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-in">
        <div className="flex items-center gap-4">
          {/* Avatar avec initiales */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E91E8C] to-[#C9177A] flex items-center justify-center shrink-0 shadow-lg shadow-pink-200">
            <span className="text-2xl font-bold text-white">{initials}</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {session?.fullName ?? '—'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Médecin gynécologue</p>
            {session?.userId && (
              <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                <PhoneIcon size={12} className="shrink-0" />
                Compte médecin MamaCare
              </p>
            )}
          </div>
        </div>
      </div>

      {/* -- Statistiques -- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-in">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <SettingsIcon size={14} />
          Mes statistiques
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {/* Patientes actives */}
          <div className="flex flex-col items-center gap-1 bg-pink-50 rounded-xl p-3 border border-pink-100">
            <span className="text-2xl font-bold text-[#E91E8C]">
              {stats?.activePatients ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <UsersIcon size={12} className="text-pink-400 shrink-0" />
              <span className="text-xs text-gray-500 text-center leading-tight">Patientes actives</span>
            </div>
          </div>

          {/* Alertes résolues */}
          <div className="flex flex-col items-center gap-1 bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <span className="text-2xl font-bold text-emerald-600">
              {stats?.resolvedAlerts ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <BellIcon size={12} className="text-emerald-400 shrink-0" />
              <span className="text-xs text-gray-500 text-center leading-tight">Alertes résolues</span>
            </div>
          </div>

          {/* Questionnaires */}
          <div className="flex flex-col items-center gap-1 bg-blue-50 rounded-xl p-3 border border-blue-100">
            <span className="text-2xl font-bold text-blue-600">
              {stats?.questionnaires ?? 0}
            </span>
            <div className="flex items-center gap-1">
              <ClipboardIcon size={12} className="text-blue-400 shrink-0" />
              <span className="text-xs text-gray-500 text-center leading-tight">Ce mois-ci</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          Statistiques du mois en cours
        </p>
      </div>

      {/* -- Paramètres -- */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in">
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <SettingsIcon size={14} />
            Paramètres
          </h2>
        </div>

        <div className="divide-y divide-gray-50">
          {settingsItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 border border-gray-100">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{item.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.badge && (
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
                <ChevronRightIcon size={16} className="text-gray-300" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* -- Déconnexion -- */}
      <button
        type="button"
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl
          border-2 border-red-200 bg-red-50 text-red-600 font-semibold text-sm
          hover:bg-red-100 hover:border-red-300 active:scale-[0.98]
          transition-all animate-in"
      >
        <LogoutIcon size={18} />
        Se déconnecter
      </button>

      {/* Espacement bas pour la bottom nav */}
      <div className="h-4" />
    </div>
  );
}
