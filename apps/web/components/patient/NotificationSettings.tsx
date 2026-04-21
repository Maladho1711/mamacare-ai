'use client';

/**
 * ─── NotificationSettings ───────────────────────────────────────────────────
 *
 * Permet à la patiente d'activer/désactiver les rappels push quotidiens
 * et de choisir l'heure du rappel.
 *
 * States gérés :
 *  - navigateur sans support Push → message informatif
 *  - permission refusée → guide pour débloquer
 *  - activation/désactivation avec feedback visuel
 *  - sauvegarde de l'heure (rappel local SW + PATCH /patients/me)
 */

import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { apiClient } from '@/lib/api/client';
import Button from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationSettingsProps {
  /** Heure de rappel actuelle depuis le profil patiente, ex: "08:00" */
  currentNotificationTime?: string;
  /** Callback appelé après sauvegarde réussie */
  onTimeChange?: (time: string) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NotificationSettings({
  currentNotificationTime = '08:00',
  onTimeChange,
}: NotificationSettingsProps) {
  const {
    supported,
    permission,
    subscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    scheduleLocalReminder,
  } = usePushNotifications();

  const [reminderTime, setReminderTime] = useState<string>(
    currentNotificationTime,
  );
  const [savingTime, setSavingTime] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleToggle() {
    if (subscribed) {
      await unsubscribe();
    } else {
      const ok = await subscribe();
      // Si activation réussie, programmer immédiatement le rappel local
      if (ok) {
        await scheduleLocalReminder(reminderTime);
      }
    }
  }

  async function handleSaveTime() {
    setSavingTime(true);
    setSaveSuccess(false);

    try {
      // Reprogrammer le rappel local via SW
      await scheduleLocalReminder(reminderTime);

      // Persister l'heure dans le profil patiente
      // MVP : best-effort, on ne bloque pas si le backend ne supporte pas encore
      try {
        await apiClient.patch('/patients/me', {
          notificationTime: reminderTime,
        });
      } catch {
        // Endpoint optionnel — on log silencieusement pour le MVP
        console.warn('[NotificationSettings] PATCH /patients/me non disponible');
      }

      setSaveSuccess(true);
      onTimeChange?.(reminderTime);

      // Réinitialiser le badge de succès après 3s
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSavingTime(false);
    }
  }

  // ─── Cas : navigateur non supporté ────────────────────────────────────────

  if (!supported) {
    return (
      <section
        aria-label="Paramètres de notifications"
        className="bg-gray-50 border border-gray-200 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🔔</span>
          <div>
            <h2 className="font-semibold text-gray-800 text-base">
              Rappels quotidiens
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Les notifications ne sont pas disponibles sur ce navigateur.
              Essayez Chrome ou Safari sur votre téléphone.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ─── Cas : permission refusée (ne peut pas être réactivée programmatiquement) ──

  if (permission === 'denied') {
    return (
      <section
        aria-label="Paramètres de notifications"
        className="bg-orange-50 border border-orange-200 rounded-2xl p-5"
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🔕</span>
          <div>
            <h2 className="font-semibold text-orange-800 text-base">
              Notifications bloquées
            </h2>
            <p className="text-sm text-orange-700 mt-1 leading-relaxed">
              Vous avez bloqué les notifications pour cette application.
              Pour les réactiver, allez dans les{' '}
              <strong>paramètres de votre navigateur</strong> et autorisez
              les notifications pour MamaCare AI.
            </p>
          </div>
        </div>
      </section>
    );
  }

  // ─── Cas nominal ──────────────────────────────────────────────────────────

  return (
    <section
      aria-label="Paramètres de notifications"
      className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 flex flex-col gap-5"
    >
      {/* En-tête */}
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden="true">🔔</span>
        <div>
          <h2 className="font-semibold text-gray-900 text-base">
            Rappels quotidiens
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">
            Recevez un rappel chaque jour pour votre questionnaire de santé.
          </p>
        </div>
      </div>

      {/* Message d'erreur */}
      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3"
        >
          {error}
        </p>
      )}

      {/* Toggle activation */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          {subscribed ? 'Activé' : 'Désactivé'}
        </span>

        <button
          role="switch"
          aria-checked={subscribed}
          aria-label={
            subscribed
              ? 'Désactiver les rappels quotidiens'
              : 'Activer les rappels quotidiens'
          }
          onClick={handleToggle}
          disabled={loading}
          className={[
            'relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full',
            'transition-colors duration-200 ease-in-out',
            'focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            subscribed ? 'bg-[#E91E8C]' : 'bg-gray-300',
          ].join(' ')}
        >
          <span
            aria-hidden="true"
            className={[
              'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow',
              'transform transition-transform duration-200 ease-in-out',
              'mt-1',
              subscribed ? 'translate-x-6' : 'translate-x-1',
            ].join(' ')}
          />
        </button>
      </div>

      {/* Sélecteur d'heure — visible uniquement quand activé */}
      {subscribed && (
        <div className="flex flex-col gap-3 pt-1 border-t border-gray-100">
          <label
            htmlFor="reminder-time"
            className="text-sm font-medium text-gray-700"
          >
            Heure du rappel
          </label>

          <input
            id="reminder-time"
            type="time"
            value={reminderTime}
            onChange={(e) => {
              setReminderTime(e.target.value);
              setSaveSuccess(false);
            }}
            className={[
              'w-full rounded-xl border px-4 py-3 text-sm text-gray-900',
              'focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-[#E91E8C]',
              'transition-colors duration-150',
              'border-gray-300',
            ].join(' ')}
            aria-label="Heure du rappel quotidien"
          />

          <Button
            variant="primary"
            size="md"
            fullWidth
            isLoading={savingTime}
            onClick={handleSaveTime}
            disabled={savingTime}
          >
            {saveSuccess ? '✓ Heure sauvegardée !' : 'Sauvegarder l'heure'}
          </Button>
        </div>
      )}
    </section>
  );
}
