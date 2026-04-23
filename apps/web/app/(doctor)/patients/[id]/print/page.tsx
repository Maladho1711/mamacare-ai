'use client';

/**
 * --- Fiche patiente imprimable / PDF ---------------------------------------
 *
 * Layout A4 optimisé pour impression et export PDF via le navigateur.
 * Clic sur "Imprimer" → dialog natif → "Enregistrer en PDF".
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';

interface PatientApi {
  id: string;
  fullName: string;
  phone: string;
  pregnancyStart: string;
  expectedTerm: string;
  status: string;
  riskLevel: 'red' | 'orange' | 'green';
  notes: string | null;
  createdAt: string;
}

interface HistoryEntry {
  id: string;
  submitted_at: string;
  alert_level: 'red' | 'orange' | 'green';
  triggered_rules: string[];
  ai_analysis: string | null;
}

interface Appointment {
  id: string;
  type: string;
  title: string;
  scheduledAt: string;
  status: string;
  location: string | null;
}

const RISK_LABEL: Record<string, string> = {
  red: 'ROUGE (urgence)',
  orange: 'ORANGE (surveillance)',
  green: 'VERT (normal)',
};

const STATUS_LABEL: Record<string, string> = {
  pregnant: 'Grossesse',
  postnatal: 'Post-natal',
  completed: 'Terminé',
};

const TYPE_LABEL: Record<string, string> = {
  cpn: 'CPN',
  vaccination: 'Vaccination',
  ultrasound: 'Échographie',
  consultation: 'Consultation',
  postnatal: 'Suivi post-natal',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function pregnancyWeek(start: string): number {
  const d = new Date(start);
  const weeks = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 7));
  return Math.max(0, weeks);
}

export default function PatientPrintPage() {
  useSession({ required: true, requireRole: 'doctor' });
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<PatientApi | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId) return;
    (async () => {
      try {
        const [p, h, a, s] = await Promise.all([
          apiClient.get<PatientApi>(`/patients/${patientId}`),
          apiClient.get<HistoryEntry[]>(`/questionnaire/history/${patientId}`),
          apiClient
            .get<Appointment[]>(`/appointments/patient/${patientId}`)
            .catch(() => [] as Appointment[]),
          apiClient
            .get<{ summary: string }>(`/patients/${patientId}/summary`)
            .catch(() => ({ summary: '' })),
        ]);
        setPatient(p);
        setHistory(h);
        setAppointments(a);
        setSummary(s.summary);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Chargement…</div>;
  }
  if (error || !patient) {
    return (
      <div className="p-8 text-center text-red-600">
        {error ?? 'Patiente introuvable'}
      </div>
    );
  }

  const sa = pregnancyWeek(patient.pregnancyStart);
  const stats = {
    total: history.length,
    red: history.filter((h) => h.alert_level === 'red').length,
    orange: history.filter((h) => h.alert_level === 'orange').length,
    green: history.filter((h) => h.alert_level === 'green').length,
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Barre d'actions (non imprimée) */}
      <div className="no-print sticky top-0 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← Retour
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2 rounded-lg bg-[#E91E8C] text-white text-sm font-medium hover:bg-pink-700"
        >
          🖨️ Imprimer / Enregistrer en PDF
        </button>
      </div>

      {/* Contenu imprimable */}
      <div className="print-page max-w-[800px] mx-auto px-8 py-8">
        {/* En-tête */}
        <header className="border-b-2 border-[#E91E8C] pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#E91E8C]">MamaCare AI</h1>
              <p className="text-xs text-gray-600 mt-1">
                Fiche médicale — Suivi grossesse / post-natal
              </p>
            </div>
            <div className="text-right text-xs text-gray-500">
              Édité le {formatDate(new Date().toISOString())}
            </div>
          </div>
        </header>

        {/* Identité */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
            Identité
          </h2>
          <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
            <div>
              <span className="text-gray-500">Nom complet :</span>{' '}
              <span className="font-medium">{patient.fullName}</span>
            </div>
            <div>
              <span className="text-gray-500">Téléphone :</span>{' '}
              <span className="font-medium">{patient.phone}</span>
            </div>
            <div>
              <span className="text-gray-500">Début grossesse :</span>{' '}
              <span className="font-medium">{formatDate(patient.pregnancyStart)}</span>
            </div>
            <div>
              <span className="text-gray-500">Terme prévu :</span>{' '}
              <span className="font-medium">{formatDate(patient.expectedTerm)}</span>
            </div>
            <div>
              <span className="text-gray-500">Âge gestationnel :</span>{' '}
              <span className="font-medium">{sa} SA</span>
            </div>
            <div>
              <span className="text-gray-500">Statut :</span>{' '}
              <span className="font-medium">
                {STATUS_LABEL[patient.status] ?? patient.status}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-gray-500">Niveau de risque actuel :</span>{' '}
              <span
                className={`font-semibold ${
                  patient.riskLevel === 'red'
                    ? 'text-red-700'
                    : patient.riskLevel === 'orange'
                      ? 'text-orange-700'
                      : 'text-emerald-700'
                }`}
              >
                {RISK_LABEL[patient.riskLevel]}
              </span>
            </div>
          </div>
        </section>

        {/* Résumé IA */}
        {summary && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
              Synthèse clinique (7 derniers jours)
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{summary}</p>
          </section>
        )}

        {/* Notes médicales */}
        {patient.notes && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
              Notes médicales
            </h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">
              {patient.notes}
            </p>
          </section>
        )}

        {/* Statistiques questionnaires */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
            Adhésion au suivi (30 derniers jours)
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div className="border border-gray-200 rounded p-3">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-gray-500">Questionnaires</div>
            </div>
            <div className="border border-red-200 bg-red-50 rounded p-3">
              <div className="text-2xl font-bold text-red-700">{stats.red}</div>
              <div className="text-xs text-red-700">Rouges</div>
            </div>
            <div className="border border-orange-200 bg-orange-50 rounded p-3">
              <div className="text-2xl font-bold text-orange-700">{stats.orange}</div>
              <div className="text-xs text-orange-700">Oranges</div>
            </div>
            <div className="border border-emerald-200 bg-emerald-50 rounded p-3">
              <div className="text-2xl font-bold text-emerald-700">{stats.green}</div>
              <div className="text-xs text-emerald-700">Verts</div>
            </div>
          </div>
        </section>

        {/* Historique questionnaires */}
        {history.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
              Historique questionnaires
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-1 pr-2 font-medium text-gray-600">Date</th>
                  <th className="py-1 pr-2 font-medium text-gray-600">Alerte</th>
                  <th className="py-1 font-medium text-gray-600">Symptômes / IA</th>
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 20).map((h) => (
                  <tr key={h.id} className="border-b border-gray-100 align-top">
                    <td className="py-1 pr-2 whitespace-nowrap">
                      {formatDate(h.submitted_at)}
                    </td>
                    <td className="py-1 pr-2">
                      <span
                        className={`uppercase text-xs font-semibold ${
                          h.alert_level === 'red'
                            ? 'text-red-700'
                            : h.alert_level === 'orange'
                              ? 'text-orange-700'
                              : 'text-emerald-700'
                        }`}
                      >
                        {h.alert_level}
                      </span>
                    </td>
                    <td className="py-1 text-xs text-gray-700">
                      {h.triggered_rules.length > 0
                        ? h.triggered_rules.join(', ')
                        : h.ai_analysis ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Rendez-vous */}
        {appointments.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-semibold mb-3 border-b border-gray-200 pb-1">
              Rendez-vous
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200">
                  <th className="py-1 pr-2 font-medium text-gray-600">Date</th>
                  <th className="py-1 pr-2 font-medium text-gray-600">Type</th>
                  <th className="py-1 pr-2 font-medium text-gray-600">Titre</th>
                  <th className="py-1 font-medium text-gray-600">Statut</th>
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100">
                    <td className="py-1 pr-2">{formatDate(a.scheduledAt)}</td>
                    <td className="py-1 pr-2">
                      {TYPE_LABEL[a.type] ?? a.type}
                    </td>
                    <td className="py-1 pr-2">{a.title}</td>
                    <td className="py-1 text-xs">{a.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Pied de page */}
        <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
          Document confidentiel — MamaCare AI — Guinée
        </footer>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
          .print-page {
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 15mm;
          }
        }
      `}</style>
    </div>
  );
}
