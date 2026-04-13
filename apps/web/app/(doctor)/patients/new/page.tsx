'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  fullName: string;
  phone: string;
  pregnancyStart: string;
  expectedTerm: string;
  status: 'pregnant' | 'postnatal';
  notes: string;
}

type FieldErrors = Partial<Record<keyof FormState, string>>;

/** DDR + 280 jours = terme prévu estimé */
function calcExpectedTerm(ddr: string): string {
  if (!ddr) return '';
  const d = new Date(ddr);
  d.setDate(d.getDate() + 280);
  return d.toISOString().split('T')[0] ?? '';
}

/** Format téléphone guinéen : +224 622 12 34 56 */
function formatGuineanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  // Si commence par 224, formater avec préfixe
  if (digits.startsWith('224') && digits.length > 3) {
    const local = digits.slice(3);
    return `+224 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5, 7)} ${local.slice(7, 9)}`.trim();
  }
  // Sinon formater le numéro local
  return `${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`.trim();
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function NewPatientPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState('');
  const [form, setForm] = useState<FormState>({
    fullName: '',
    phone: '',
    pregnancyStart: '',
    expectedTerm: '',
    status: 'pregnant',
    notes: '',
  });

  function set(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Calcul automatique du terme quand on change la DDR
      if (field === 'pregnancyStart' && value && !prev.expectedTerm) {
        next.expectedTerm = calcExpectedTerm(value);
      }
      return next;
    });
    // Effacer l'erreur du champ quand on tape
    if (errors[field]) {
      setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
    }
  }

  function validate(): boolean {
    const errs: FieldErrors = {};
    if (!form.fullName.trim()) errs.fullName = 'Le nom est obligatoire';
    if (!form.phone.trim()) errs.phone = 'Le numéro est obligatoire';
    else if (form.phone.replace(/\D/g, '').length < 8) errs.phone = 'Numéro trop court (min 8 chiffres)';
    if (!form.pregnancyStart) errs.pregnancyStart = 'La date DDR est obligatoire';
    if (!form.expectedTerm) errs.expectedTerm = 'Le terme prévu est obligatoire';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGlobalError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const phone = form.phone.replace(/\D/g, '');
      const phoneE164 = phone.startsWith('224') ? `+${phone}` : `+224${phone}`;
      await apiClient.post('/patients', {
        fullName:       form.fullName.trim(),
        phone:          phoneE164,
        pregnancyStart: form.pregnancyStart,
        expectedTerm:   form.expectedTerm,
        status:         form.status,
        notes:          form.notes.trim() || undefined,
      });
      router.push('/patients');
    } catch (err) {
      setGlobalError(
        err instanceof ApiError ? err.message : 'Erreur lors de la création.',
      );
      setSubmitting(false);
    }
  }

  if (sessionLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Nouvelle patiente</h1>
      </div>

      <div>
        <form onSubmit={(e) => { void handleSubmit(e); }} className="flex flex-col gap-5">

          {/* Nom complet */}
          <Field label="Nom complet *" error={errors.fullName}>
            <input
              type="text"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Fatoumata Diallo"
              autoComplete="name"
              className={`${INPUT_CLASS} ${errors.fullName ? ERRORED : ''}`}
            />
          </Field>

          {/* Téléphone */}
          <Field label="Téléphone (WhatsApp) *" error={errors.phone}>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-sm text-gray-600 font-medium">
                +224
              </span>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                onBlur={() => { if (form.phone) set('phone', formatGuineanPhone(form.phone)); }}
                placeholder="622 12 34 56"
                autoComplete="tel"
                inputMode="tel"
                className={`flex-1 ${INPUT_CLASS} rounded-l-none ${errors.phone ? ERRORED : ''}`}
              />
            </div>
          </Field>

          {/* Statut */}
          <Field label="Statut *">
            <div className="flex gap-3">
              {(['pregnant', 'postnatal'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set('status', s)}
                  className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors
                    ${form.status === s
                      ? 'border-[#E91E8C] bg-[#FDE8F3] text-[#C9177A]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {s === 'pregnant' ? 'Grossesse' : 'Post-natal'}
                </button>
              ))}
            </div>
          </Field>

          {/* Début de grossesse */}
          <Field label="Date de début de grossesse (DDR) *" error={errors.pregnancyStart}>
            <input
              type="date"
              value={form.pregnancyStart}
              onChange={(e) => {
                set('pregnancyStart', e.target.value);
                // Auto-calcul du terme
                if (e.target.value) {
                  setForm((prev) => ({ ...prev, pregnancyStart: e.target.value, expectedTerm: calcExpectedTerm(e.target.value) }));
                }
              }}
              max={new Date().toISOString().split('T')[0]}
              className={`${INPUT_CLASS} ${errors.pregnancyStart ? ERRORED : ''}`}
            />
            {form.pregnancyStart && (
              <p className="text-xs text-[#E91E8C] mt-1">
                SA {Math.floor((Date.now() - new Date(form.pregnancyStart).getTime()) / (7 * 24 * 60 * 60 * 1000))} actuellement
              </p>
            )}
          </Field>

          {/* Terme prévu */}
          <Field label="Terme prévu *" error={errors.expectedTerm}>
            <input
              type="date"
              value={form.expectedTerm}
              onChange={(e) => set('expectedTerm', e.target.value)}
              min={form.pregnancyStart || undefined}
              className={`${INPUT_CLASS} ${errors.expectedTerm ? ERRORED : ''}`}
            />
            {form.pregnancyStart && form.expectedTerm && (
              <p className="text-xs text-gray-400 mt-1">
                Calculé automatiquement (DDR + 280 jours). Modifiable.
              </p>
            )}
          </Field>

          {/* Notes */}
          <Field label="Notes cliniques (optionnel)">
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Antécédents, remarques..."
              rows={3}
              maxLength={500}
              className={`${INPUT_CLASS} resize-none`}
            />
            <p className="text-xs text-gray-400 text-right mt-0.5">
              {form.notes.length}/500
            </p>
          </Field>

          {/* Erreur globale */}
          {globalError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
              {globalError}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={submitting}
          >
            {submitting ? 'Enregistrement…' : 'Créer la patiente'}
          </Button>
        </form>
      </div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <span>&#9888;</span> {error}
        </p>
      )}
    </div>
  );
}

const INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 ' +
  'placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] transition-shadow';

const ERRORED = 'border-red-300 focus:ring-red-400';
