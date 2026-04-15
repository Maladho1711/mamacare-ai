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

const LEVEL_CONFIG = {
  green: {
    wrapper: 'bg-emerald-50 border-emerald-300',
    title:   'text-emerald-800',
    body:    'text-emerald-700',
    icon: '✅', label: 'Tout va bien',
    message: 'Continuez à prendre soin de vous. Hydratez-vous, reposez-vous, et consultez à la prochaine date prévue.',
  },
  orange: {
    wrapper: 'bg-orange-50 border-orange-300',
    title:   'text-orange-800',
    body:    'text-orange-700',
    icon: '⚠️', label: 'À surveiller',
    message: "Certains symptômes méritent attention. Appelez votre médecin si ça s'empire.",
  },
  red: {
    wrapper: 'bg-red-50 border-red-400',
    title:   'text-red-800',
    body:    'text-red-700',
    icon: '🚨', label: 'Urgence',
    message: 'Votre médecin a été alerté. Contactez-le immédiatement ou rendez-vous au centre de santé.',
  },
} as const;

// ─── Composant ────────────────────────────────────────────────────────────────

interface DoctorInfo {
  fullName: string;
  phone: string;
}

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

  // Charger le num\u00e9ro du m\u00e9decin (pour les alertes rouges)
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

        {/* ── Carte résultat ── */}
        <div className={`rounded-2xl border-2 p-6 ${cfg.wrapper}`}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl" role="img" aria-label={cfg.label}>{cfg.icon}</span>
            <h1 className={`text-2xl font-bold ${cfg.title}`}>{cfg.label}</h1>
          </div>
          <p className={`text-sm leading-relaxed ${cfg.body}`}>{cfg.message}</p>
        </div>

        {/* ── Explication Claude ── */}
        {result.explanation && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Explication
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">{result.explanation}</p>
          </div>
        )}

        {/* ── Symptômes déclencheurs ── */}
        {result.triggeredRules.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Signes détectés
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {result.triggeredRules.map((rule) => (
                <span
                  key={rule}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    result.alertLevel === 'red'
                      ? 'bg-red-100 text-red-700'
                      : result.alertLevel === 'orange'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {rule.toLowerCase().replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Appel urgence (RED) ── */}
        {result.alertLevel === 'red' && doctor?.phone && (
          <a
            href={`tel:${doctor.phone}`}
            className="flex items-center justify-center gap-2 w-full p-4 rounded-xl
              bg-red-600 text-white font-semibold text-base
              hover:bg-red-700 active:scale-[0.98] transition-all animate-pulse"
          >
            <span>📞</span> Appeler {doctor.fullName || 'mon médecin'}
          </a>
        )}
        {result.alertLevel === 'red' && !doctor?.phone && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 text-center">
            Chargement du contact médecin...
          </div>
        )}

        {/* ── Vigilance (ORANGE) ── */}
        {result.alertLevel === 'orange' && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm text-orange-700 font-medium mb-2">
              Surveillez vos symptômes de près
            </p>
            <p className="text-xs text-orange-600">
              Si vos symptômes s'aggravent dans les prochaines heures, contactez votre médecin sans attendre.
            </p>
          </div>
        )}

        {/* ── Conseils (GREEN) ── */}
        {result.alertLevel === 'green' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs text-emerald-700 leading-relaxed">
              Continuez à boire beaucoup d'eau, prenez vos suppléments, et reposez-vous bien. Votre prochain check-up est demain matin.
            </p>
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
