'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface PatientApi {
  id:              string;
  fullName:        string;
  phone:           string;
  pregnancyStart:  string;
  expectedTerm:    string;
  status:          string;
  notes?:          string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  fullName:        string;
  phone:           string;
  pregnancyStart:  string;
  expectedTerm:    string;
  status:          'pregnant' | 'postnatal' | 'completed';
  notes:           string;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function EditPatientPage() {
  const router    = useRouter();
  const params    = useParams();
  const patientId = params?.id as string;

  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [disabling,   setDisabling]   = useState(false);
  const [error,       setError]       = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [form, setForm] = useState<FormState>({
    fullName:       '',
    phone:          '',
    pregnancyStart: '',
    expectedTerm:   '',
    status:         'pregnant',
    notes:          '',
  });

  useEffect(() => {
    if (sessionLoading || !session || !patientId) return;
    let cancelled = false;

    (async () => {
      try {
        const pat = await apiClient.get<PatientApi>(`/patients/${patientId}`);
        if (cancelled) return;
        setForm({
          fullName:       pat.fullName,
          phone:          pat.phone,
          pregnancyStart: pat.pregnancyStart.split('T')[0] ?? '',
          expectedTerm:   pat.expectedTerm.split('T')[0] ?? '',
          status:         pat.status as 'pregnant' | 'postnatal' | 'completed',
          notes:          pat.notes ?? '',
        });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/patients');
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erreur lors du chargement',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, session, patientId, router]);

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!form.fullName.trim())  { setError('Le nom est obligatoire.'); return; }
    if (!form.phone.trim())     { setError('Le téléphone est obligatoire.'); return; }
    if (!form.pregnancyStart)   { setError('La date de début de grossesse est obligatoire.'); return; }
    if (!form.expectedTerm)     { setError('Le terme prévu est obligatoire.'); return; }

    setSubmitting(true);
    try {
      await apiClient.patch(`/patients/${patientId}`, {
        fullName:       form.fullName.trim(),
        phone:          form.phone.trim().replace(/[\s()-]/g, ''),
        pregnancyStart: form.pregnancyStart,
        expectedTerm:   form.expectedTerm,
        status:         form.status,
        notes:          form.notes.trim() || null,
      });
      router.push(`/patients/${patientId}`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Erreur lors de la mise à jour.',
      );
      setSubmitting(false);
    }
  }

  // F08 — Désactiver patiente
  async function handleDisable() {
    setDisabling(true);
    try {
      await apiClient.patch(`/patients/${patientId}`, { status: 'completed' });
      router.push('/patients');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Erreur lors de la désactivation.',
      );
      setDisabling(false);
      setShowConfirm(false);
    }
  }

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Modifier la patiente</h1>
          {form.fullName && (
            <p className="text-sm text-gray-500 mt-0.5">{form.fullName}</p>
          )}
        </div>
      </div>

      <div>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-5">

          <Field label="Nom complet *">
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Téléphone (WhatsApp) *">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              inputMode="tel"
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Statut *">
            <div className="flex gap-2">
              {(['pregnant', 'postnatal', 'completed'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-colors
                    ${form.status === s
                      ? 'border-[#E91E8C] bg-[#FDE8F3] text-[#C9177A]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {s === 'pregnant' ? 'Grossesse' : s === 'postnatal' ? 'Post-natal' : 'Terminé'}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Date de début de grossesse (DDR) *">
            <input
              type="date"
              value={form.pregnancyStart}
              onChange={(e) => set('pregnancyStart', e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Terme prévu *">
            <input
              type="date"
              value={form.expectedTerm}
              onChange={(e) => set('expectedTerm', e.target.value)}
              className={INPUT_CLS}
            />
          </Field>

          <Field label="Notes cliniques (optionnel)">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Antécédents, remarques…"
              rows={3}
              className={`${INPUT_CLS} resize-none`}
            />
          </Field>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">{error}</p>
          )}

          <Button type="submit" variant="primary" fullWidth disabled={submitting}>
            {submitting ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </Button>
        </form>

        {/* ── Zone désactivation (F08) ── */}
        {form.status !== 'completed' && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
              Zone de danger
            </p>

            {!showConfirm ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-full py-3 rounded-xl border-2 border-red-200 text-red-600 text-sm font-semibold
                  hover:bg-red-50 transition-colors"
              >
                Désactiver le suivi de cette patiente
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-3">
                <p className="text-sm text-red-700 font-medium">
                  Confirmer la désactivation ?
                </p>
                <p className="text-xs text-red-500">
                  Le suivi sera marqué "Terminé". Les données sont conservées (audit trail).
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm font-medium
                      hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleDisable(); }}
                    disabled={disabling}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold
                      hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {disabling ? 'En cours…' : 'Confirmer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}

const INPUT_CLS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] transition-shadow';
