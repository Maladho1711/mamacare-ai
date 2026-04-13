'use client';

/**
 * ─── Page Alertes (médecin) ─────────────────────────────────────────────────
 *
 * Liste des alertes non résolues — via GET /alerts.
 * Le backend renvoie les mocks en mode dev.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import AlertBadge from '@/components/doctor/AlertBadge';
import Spinner from '@/components/ui/Spinner';

// ─── Types (shape renvoyée par le backend NestJS) ───────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [alerts,    setAlerts]    = useState<AlertItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !session) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiClient.get<AlertApiRow[]>('/alerts');
        if (cancelled) return;
        setAlerts(data.map(mapAlert));
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

    return () => {
      cancelled = true;
    };
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
    } catch {
      /* ignore — l'utilisateur peut retenter */
    } finally {
      setResolving(null);
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
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

  const unresolved = alerts.filter((a) => !a.resolved_at);
  const ordered = [
    ...unresolved.filter((a) => a.alert_type === 'red'),
    ...unresolved.filter((a) => a.alert_type !== 'red'),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Alertes</h1>
        {unresolved.length > 0 && (
          <p className="text-xs text-red-600 font-semibold mt-0.5">
            {unresolved.length} non résolue{unresolved.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
        {ordered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
            <p className="text-3xl mb-3">✅</p>
            <p className="text-gray-600 text-sm font-semibold">Aucune alerte en cours</p>
            <p className="text-gray-400 text-xs mt-1">Toutes les patientes sont suivies.</p>
          </div>
        )}

        {ordered.map((alert) => {
          const delivery = deliveryStatus(alert);
          return (
            <article
              key={alert.id}
              className={`
                bg-white rounded-2xl border shadow-sm flex flex-col gap-3 overflow-hidden
                ${alert.alert_type === 'red' ? 'border-l-4 border-l-red-500' : 'border-gray-200'}
              `}
            >
              <div className="flex items-start justify-between gap-3 px-4 pt-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertBadge level={alert.alert_type} />
                    <time className="text-xs text-gray-400" dateTime={alert.created_at}>
                      {timeAgo(alert.created_at)}
                    </time>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(`/patients/${alert.patient_id}`)}
                    className="text-sm font-bold text-gray-800 hover:text-[#E91E8C] transition-colors text-left"
                  >
                    {alert.patient_name}
                  </button>
                  <p className="text-xs text-gray-400 mt-0.5">{alert.patient_phone}</p>
                </div>

                <button
                  type="button"
                  onClick={() => void resolve(alert.id)}
                  disabled={resolving === alert.id}
                  className="shrink-0 text-xs text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-full font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resolving === alert.id ? '…' : '✓ Résoudre'}
                </button>
              </div>

              <p className="px-4 text-sm text-gray-700 leading-relaxed">
                {alert.message}
              </p>

              <div className="px-4 pb-4 flex items-center justify-between border-t border-gray-50 pt-3">
                <span className={`text-xs font-medium ${delivery.className}`}>
                  {delivery.label}
                </span>
                <div className="flex items-center gap-3">
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
                    className="text-xs text-gray-500 font-medium hover:text-[#E91E8C] transition-colors"
                  >
                    📞 Appeler
                  </a>
                </div>
              </div>
            </article>
          );
        })}
    </div>
  );
}
