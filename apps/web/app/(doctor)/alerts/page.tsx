'use client';

/**
 * --- Page Alertes (médecin) -------------------------------------------------
 *
 * Liste des alertes avec filtres, badges de comptage et cards redessinées.
 * Données via GET /alerts — backend renvoie les mocks en mode dev.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import AlertBadge from '@/components/doctor/AlertBadge';
import EmptyState from '@/components/ui/EmptyState';
import FilterChip from '@/components/ui/FilterChip';
import { useToast } from '@/components/ui/Toast';

// --- Types --------------------------------------------------------------------

interface AlertApiRow {
  id:            string;
  patient_id:    string;
  alert_type:    string;
  message:       string;
  whatsapp_sent: boolean;
  sms_sent:      boolean;
  resolved_at:   string | null;
  created_at:    string;
  patient: {
    id:        string;
    full_name: string;
    phone:     string;
  } | null;
}

interface AlertItem {
  id:            string;
  patient_id:    string;
  alert_type:    string;
  message:       string;
  whatsapp_sent: boolean;
  sms_sent:      boolean;
  resolved_at:   string | null;
  created_at:    string;
  patient_name:  string;
  patient_phone: string;
}

type FilterKey = 'all' | 'red' | 'orange' | 'resolved';

// --- Helpers ------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diff < 1)  return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  const h = Math.floor(diff / 60);
  if (h < 24)    return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)} j`;
}

function whatsappUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

function deliveryStatus(a: AlertItem): { label: string; className: string } {
  if (a.whatsapp_sent) return { label: '✅ WhatsApp envoyé', className: 'text-emerald-600' };
  if (a.sms_sent)      return { label: '📱 SMS envoyé',      className: 'text-blue-600' };
  return                      { label: '⏳ Envoi en cours…', className: 'text-gray-400' };
}

function mapAlert(row: AlertApiRow): AlertItem {
  return {
    id:            row.id,
    patient_id:    row.patient_id,
    alert_type:    row.alert_type,
    message:       row.message,
    whatsapp_sent: row.whatsapp_sent,
    sms_sent:      row.sms_sent,
    resolved_at:   row.resolved_at,
    created_at:    row.created_at,
    patient_name:  row.patient?.full_name ?? '—',
    patient_phone: row.patient?.phone ?? '—',
  };
}

/** Style de la card selon le niveau et l'état résolu */
function cardStyle(alert: AlertItem): string {
  if (alert.resolved_at) {
    return 'border-l-4 border-l-gray-200 border-gray-100 opacity-60';
  }
  if (alert.alert_type === 'red') {
    return 'border-l-4 border-l-red-500 border-red-100 bg-red-50/30';
  }
  if (alert.alert_type === 'orange') {
    return 'border-l-4 border-l-orange-400 border-orange-100 bg-orange-50/30';
  }
  return 'border-gray-100';
}

// --- Skeleton -----------------------------------------------------------------

function AlertSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[0, 1, 2].map((i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 bg-gray-200 rounded-full" />
              <div className="h-4 w-16 bg-gray-200 rounded-full" />
            </div>
            <div className="h-7 w-24 bg-gray-200 rounded-full" />
          </div>
          <div className="h-4 bg-gray-200 rounded-full w-2/3" />
          <div className="h-3 bg-gray-200 rounded-full w-full" />
          <div className="h-3 bg-gray-200 rounded-full w-4/5" />
        </div>
      ))}
    </div>
  );
}

// --- Composant ----------------------------------------------------------------

export default function AlertsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [alerts,    setAlerts]    = useState<AlertItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [filter,    setFilter]    = useState<FilterKey>('all');

  useEffect(() => {
    if (sessionLoading || !session) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiClient.get<AlertApiRow[]>('/alerts');
        if (cancelled) return;
        // Trier : rouge en premier, puis orange, puis résolues
        const mapped = data.map(mapAlert);
        const sorted = [
          ...mapped.filter((a) => !a.resolved_at && a.alert_type === 'red'),
          ...mapped.filter((a) => !a.resolved_at && a.alert_type !== 'red'),
          ...mapped.filter((a) => !!a.resolved_at),
        ];
        setAlerts(sorted);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erreur lors du chargement des alertes',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionLoading, session]);

  const resolve = async (alertId: string) => {
    if (resolving) return;
    setResolving(alertId);
    try {
      await apiClient.patch(`/alerts/${alertId}/resolve`, {});
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, resolved_at: new Date().toISOString() } : a,
        ),
      );
      showToast('Alerte marquée comme résolue', 'success');
    } catch {
      showToast('Erreur lors de la résolution', 'error');
    } finally {
      setResolving(null);
    }
  };

  // -- Rendu loading --------------------------------------------------------
  if (loading || sessionLoading) {
    return (
      <div className="flex flex-col gap-4 max-w-2xl mx-auto">
        <div className="h-7 bg-gray-200 rounded-full w-1/3 animate-pulse" />
        <AlertSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    );
  }

  // -- Comptages -------------------------------------------------------------
  const urgencesCount   = alerts.filter((a) => !a.resolved_at && a.alert_type === 'red').length;
  const surveillerCount = alerts.filter((a) => !a.resolved_at && a.alert_type === 'orange').length;
  const resolvedCount   = alerts.filter((a) => !!a.resolved_at).length;

  // -- Filtrage selon le chip actif ------------------------------------------
  const filteredAlerts: AlertItem[] = (() => {
    switch (filter) {
      case 'red':      return alerts.filter((a) => !a.resolved_at && a.alert_type === 'red');
      case 'orange':   return alerts.filter((a) => !a.resolved_at && a.alert_type === 'orange');
      case 'resolved': return alerts.filter((a) => !!a.resolved_at);
      default:         return alerts;
    }
  })();

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">

      {/* -- Entête -- */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Alertes</h1>
          {urgencesCount === 0 && surveillerCount === 0 && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              Toutes les alertes sont résolues
            </p>
          )}
        </div>

        {/* Badges résumé */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {urgencesCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-950 border border-red-200 dark:border-red-800 text-xs font-bold text-red-700 dark:text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {urgencesCount} urgence{urgencesCount !== 1 ? 's' : ''}
            </span>
          )}
          {surveillerCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 text-xs font-bold text-orange-700 dark:text-orange-400">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {surveillerCount} à surveiller
            </span>
          )}
        </div>
      </div>

      {/* -- Filtres -- */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip
          active={filter === 'all'}
          onClick={() => setFilter('all')}
          label={`Toutes (${alerts.length})`}
        />
        <FilterChip
          active={filter === 'red'}
          onClick={() => setFilter('red')}
          label={`Urgences${urgencesCount > 0 ? ` (${urgencesCount})` : ''}`}
          variant="red"
        />
        <FilterChip
          active={filter === 'orange'}
          onClick={() => setFilter('orange')}
          label={`À surveiller${surveillerCount > 0 ? ` (${surveillerCount})` : ''}`}
          variant="orange"
        />
        <FilterChip
          active={filter === 'resolved'}
          onClick={() => setFilter('resolved')}
          label={`Résolues${resolvedCount > 0 ? ` (${resolvedCount})` : ''}`}
          variant="green"
        />
      </div>

      {/* -- Liste des alertes -- */}
      {filteredAlerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <EmptyState
            icon="🔔"
            title="Aucune alerte dans cette catégorie"
            description={
              filter === 'all'
                ? 'Toutes vos patientes sont stables. Aucune alerte en ce moment.'
                : 'Aucune alerte correspondant à ce filtre.'
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredAlerts.map((alert) => {
            const delivery   = deliveryStatus(alert);
            const isResolved = !!alert.resolved_at;

            return (
              <article
                key={alert.id}
                className={`
                  bg-white dark:bg-gray-900 rounded-2xl border shadow-sm dark:shadow-black/20 overflow-hidden
                  transition-all duration-200
                  ${cardStyle(alert)}
                `}
              >
                {/* -- Ligne supérieure : badge + temps + bouton résoudre -- */}
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <AlertBadge level={isResolved ? 'green' : alert.alert_type} />
                    {isResolved && (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Résolue</span>
                    )}
                    <time className="text-xs text-gray-400 dark:text-gray-500" dateTime={alert.created_at}>
                      {timeAgo(alert.created_at)}
                    </time>
                  </div>

                  {!isResolved && (
                    <button
                      type="button"
                      onClick={() => { void resolve(alert.id); }}
                      disabled={resolving === alert.id}
                      className="shrink-0 text-xs text-white bg-emerald-600 hover:bg-emerald-700
                        px-3 py-1.5 rounded-full font-semibold transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolving === alert.id ? '…' : '✓ Résoudre'}
                    </button>
                  )}
                </div>

                {/* -- Patiente -- */}
                <div className="px-4 pt-2">
                  <button
                    type="button"
                    onClick={() => router.push(`/patients/${alert.patient_id}`)}
                    className="flex items-center gap-2 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-pink-100 dark:bg-pink-950 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-[#E91E8C]">
                        {alert.patient_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200 group-hover:text-[#E91E8C] transition-colors">
                        {alert.patient_name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{alert.patient_phone}</p>
                    </div>
                  </button>
                </div>

                {/* -- Message -- */}
                <p className="px-4 pt-2 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {alert.message}
                </p>

                {/* -- Pied : statut envoi + actions -- */}
                <div className="px-4 pb-4 pt-3 flex items-center justify-between border-t border-gray-50 dark:border-gray-800 mt-3">
                  <span className={`text-xs font-medium ${delivery.className}`}>
                    {delivery.label}
                  </span>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => router.push(`/patients/${alert.patient_id}`)}
                      className="text-xs text-[#E91E8C] font-semibold hover:underline"
                    >
                      Voir la fiche
                    </button>
                    <a
                      href={whatsappUrl(alert.patient_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#25D366] font-semibold hover:underline"
                    >
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${alert.patient_phone}`}
                      className="text-xs text-gray-500 dark:text-gray-400 font-medium hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors"
                    >
                      Appeler
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
