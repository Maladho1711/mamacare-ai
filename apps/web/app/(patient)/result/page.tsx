'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import Button from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = 'green' | 'orange' | 'red';

interface ResultData {
  alertLevel: AlertLevel;
  explanation: string;
  triggeredRules: string[];
}

interface DoctorInfo {
  fullName: string;
  phone: string;
}

// ─── Config niveaux ───────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  green: {
    wrapper:       'bg-emerald-50 border-emerald-300',
    title:         'text-emerald-800',
    body:          'text-emerald-700',
    cardAnimation: 'fade-in',
    icon: '✅', label: 'Tout va bien',
    message: 'Continuez à prendre soin de vous. Hydratez-vous, reposez-vous, et consultez à la prochaine date prévue.',
  },
  orange: {
    wrapper:       'bg-orange-50 border-orange-300',
    title:         'text-orange-800',
    body:          'text-orange-700',
    cardAnimation: 'animate-in',
    icon: '⚠️', label: 'À surveiller',
    message: "Certains symptômes méritent attention. Appelez votre médecin si ça s'empire.",
  },
  red: {
    wrapper:       'bg-red-50 border-red-400',
    title:         'text-red-800',
    body:          'text-red-700',
    cardAnimation: 'animate-shake',
    icon: '🚨', label: 'Urgence',
    message: 'Votre médecin a été alerté. Contactez-le immédiatement ou rendez-vous au centre de santé.',
  },
} as const;

// ─── Conseils contextuels ─────────────────────────────────────────────────────

const GREEN_TIPS = [
  { icon: '💧', label: 'Hydratation',   text: 'Buvez au moins 8 verres d\'eau par jour.' },
  { icon: '😴', label: 'Repos',         text: 'Dormez suffisamment et évitez les efforts intenses.' },
  { icon: '💊', label: 'Suppléments',   text: 'Continuez vos suppléments de fer et d\'acide folique.' },
];

const ORANGE_TIPS = [
  { icon: '📋', label: 'Surveiller',    text: 'Notez l\'évolution de vos symptômes heure par heure.' },
  { icon: '📞', label: 'Appeler si…',  text: 'Les symptômes s\'aggravent ou de nouveaux apparaissent.' },
  { icon: '🚫', label: 'Ne pas…',      text: 'Ne prenez pas de médicaments sans avis médical.' },
];

// ─── Composant ────────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<ResultData | null>(null);
  const [doctor, setDoctor] = useState<DoctorInfo | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('mamacare_result');
    if (!stored) { router.replace('/questionnaire'); return; }
    try {
      setResult(JSON.parse(stored) as ResultData);
    } catch {
      router.replace('/questionnaire');
    }
  }, [router]);

  // Charger le numéro du médecin (pour les alertes rouges)
  useEffect(() => {
    if (!result || result.alertLevel !== 'red') return;
    apiClient.get<DoctorInfo>('/patients/me/doctor')
      .then(setDoctor)
      .catch(() => {});
  }, [result]);

  if (!result) return null;

  const cfg = LEVEL_CONFIG[result.alertLevel] ?? LEVEL_CONFIG.green;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Carte résultat avec animation selon niveau ── */}
      <div className={`rounded-2xl border-2 p-6 ${cfg.wrapper} ${cfg.cardAnimation}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-4xl" role="img" aria-label={cfg.label}>{cfg.icon}</span>
          <h1 className={`text-2xl font-bold ${cfg.title}`}>{cfg.label}</h1>
        </div>
        <p className={`text-sm leading-relaxed ${cfg.body}`}>{cfg.message}</p>
      </div>

      {/* ── Explication Claude ── */}
      {result.explanation && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-in">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Explication
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{result.explanation}</p>
        </div>
      )}

      {/* ── Symptômes déclencheurs ── */}
      {result.triggeredRules.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 animate-in">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Signes détectés
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {result.triggeredRules.map((rule) => (
              <span
                key={rule}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  result.alertLevel === 'red'
                    ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : result.alertLevel === 'orange'
                      ? 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                }`}
              >
                {rule.toLowerCase().replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Appel urgence (RED) ── */}
      {result.alertLevel === 'red' && (
        <div className="flex flex-col gap-3 animate-in">
          {/* Message rassurant */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-700 font-semibold mb-1">Votre médecin a été alerté</p>
            <p className="text-xs text-red-600 leading-relaxed">
              Ne restez pas seule. Appelez votre médecin ou un proche de confiance, et rendez-vous
              au centre de santé le plus proche si les symptômes persistent.
            </p>
          </div>

          {/* Bouton appel — très visible */}
          {doctor?.phone ? (
            <a
              href={`tel:${doctor.phone}`}
              className="flex items-center justify-center gap-3 w-full p-5 rounded-xl
                bg-red-600 text-white font-bold text-lg
                hover:bg-red-700 active:scale-[0.98] transition-all
                shadow-xl shadow-red-200"
            >
              <span className="text-2xl">📞</span>
              Appeler {doctor.fullName || 'mon médecin'}
            </a>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center animate-pulse">
              Chargement du contact médecin…
            </div>
          )}
        </div>
      )}

      {/* ── Vigilance (ORANGE) — conseils enrichis ── */}
      {result.alertLevel === 'orange' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-orange-100 dark:border-orange-900 shadow-sm p-5 animate-in">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            Points de vigilance
          </h2>
          <div className="flex flex-col gap-3">
            {ORANGE_TIPS.map((tip) => (
              <div key={tip.label} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{tip.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Conseils (GREEN) — enrichis avec icônes ── */}
      {result.alertLevel === 'green' && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-emerald-100 dark:border-emerald-900 shadow-sm p-5 animate-in">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">
            Conseils du jour
          </h2>
          <div className="flex flex-col gap-3">
            {GREEN_TIPS.map((tip) => (
              <div key={tip.label} className="flex items-start gap-3">
                <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{tip.label}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex flex-col gap-2 mt-2">
        <Button variant="outline" fullWidth onClick={() => router.push('/history')}>
          Voir mon historique
        </Button>
        <Button variant="ghost" fullWidth onClick={() => router.push('/questionnaire')}>
          Retour
        </Button>
      </div>
    </div>
  );
}
