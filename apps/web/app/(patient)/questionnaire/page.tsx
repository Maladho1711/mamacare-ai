'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePatient } from '@/hooks/usePatient';
import { apiClient } from '@/lib/api/client';
import Spinner from '@/components/ui/Spinner';
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

// ─── Types ────────────────────────────────────────────────────────────────────

type Choice   = { value: string; label: string };
type Question = { id: string; text: string; choices: Choice[] };
type PageStatus = 'loading' | 'already-done' | 'form' | 'submitting' | 'error';

interface TodayStatus  { submitted: boolean; alertLevel?: string }
interface SubmitResult { alertLevel: string; explanation: string; triggeredRules: string[] }

// ─── Questions (inline — bundle minimal) ─────────────────────────────────────

const PREGNANCY_BASE: Question[] = [
  { id: 'Q1',  text: 'Avez-vous des maux de tête inhabituels ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'un_peu', label: 'Un peu' }, { value: 'non', label: 'Non' }] },
  { id: 'Q2',  text: 'Voyez-vous des points lumineux ou avez-vous la vue brouillée ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'Q3',  text: 'Avez-vous des douleurs au ventre ?',
    choices: [{ value: 'non', label: 'Non' }, { value: 'legere', label: 'Légère' }, { value: 'forte', label: 'Forte' }, { value: 'tres_forte', label: 'Très forte' }] },
  { id: 'Q4',  text: 'Avez-vous des saignements vaginaux ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'Q5',  text: 'Avez-vous de la fièvre (chaleur, frissons) ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'Q6',  text: 'Votre visage, mains ou pieds sont-ils gonflés ?',
    choices: [{ value: 'oui_beaucoup', label: 'Oui, beaucoup' }, { value: 'un_peu', label: 'Un peu' }, { value: 'non', label: 'Non' }] },
  { id: 'Q8',  text: 'Comment vous sentez-vous globalement ?',
    choices: [{ value: 'bien', label: 'Bien' }, { value: 'moyen', label: 'Moyen' }, { value: 'mal', label: 'Mal' }] },
  { id: 'Q9',  text: 'Avez-vous pris vos suppléments (fer, acide folique) ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }, { value: 'plus_de_stock', label: "Je n'en ai plus" }] },
  { id: 'Q10', text: "Avez-vous bu suffisamment d'eau ?",
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'Q11', text: 'Avez-vous des difficultés à respirer normalement ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
];
const Q7: Question  = { id: 'Q7',  text: "Avez-vous ressenti des mouvements du bébé aujourd'hui ?",
  choices: [{ value: 'beaucoup', label: 'Beaucoup' }, { value: 'moins_quavant', label: "Moins qu'avant" }, { value: 'pas_du_tout', label: 'Pas du tout' }] };
const Q12: Question = { id: 'Q12', text: 'Vous êtes-vous souvent sentie triste ou anxieuse cette semaine ?',
  choices: [{ value: 'souvent', label: 'Souvent' }, { value: 'parfois', label: 'Parfois' }, { value: 'non', label: 'Non' }] };
const Q13: Question = { id: 'Q13', text: 'Avez-vous eu des pensées négatives sur vous ou votre grossesse ?',
  choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] };

const POSTNATAL: Question[] = [
  { id: 'N1', text: 'Votre bébé tète-t-il correctement ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'difficulte', label: 'Avec difficulté' }, { value: 'non', label: 'Non' }] },
  { id: 'N2', text: 'Le nombril a-t-il une rougeur ou un écoulement ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'N3', text: 'Votre bébé est-il chaud au toucher ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'N4', text: 'Votre bébé a-t-il des difficultés à respirer ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'N5', text: 'Votre bébé a-t-il une jaunisse (peau ou yeux jaunes) ?',
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
  { id: 'N6', text: "Avez-vous allaité votre bébé dans les 6 dernières heures ?",
    choices: [{ value: 'oui', label: 'Oui' }, { value: 'non', label: 'Non' }] },
];

function buildQuestions(pregnancyWeek: number, isFriday: boolean, status: string): Question[] {
  if (status === 'postnatal') return POSTNATAL;
  const qs = [...PREGNANCY_BASE];
  if (pregnancyWeek >= 14) qs.splice(6, 0, Q7);
  if (isFriday) qs.push(Q12, Q13);
  return qs;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEVEL_COLORS: Record<string, string> = {
  green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
  red:    'bg-red-50 text-red-700 border-red-200',
};
const LEVEL_LABELS: Record<string, string> = {
  green: '✅ Tout va bien', orange: '⚠️ À surveiller', red: '🚨 Urgence',
};

function draftKey() {
  return `mamacare_draft_${new Date().toDateString()}`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function QuestionnairePage() {
  const router = useRouter();
  const { patient, loading, error } = usePatient();
  const { isOnline, pendingCount, queueSubmission, syncNow } = useOfflineQueue();

  const [pageStatus,  setPageStatus]  = useState<PageStatus>('loading');
  const [questions,   setQuestions]   = useState<Question[]>([]);
  const [step,        setStep]        = useState(0);
  const [responses,   setResponses]   = useState<Record<string, string>>({});
  const [todayResult, setTodayResult] = useState<TodayStatus | null>(null);
  const [submitError, setSubmitError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Initialisation dans useEffect (pattern React correct) ─────────────────
  useEffect(() => {
    if (loading || error || !patient) return;

    // Construire la liste de questions
    const isFriday = new Date().getDay() === 5;
    const qs = buildQuestions(patient.pregnancyWeek, isFriday, patient.status);
    setQuestions(qs);

    // Reprendre le brouillon si disponible
    try {
      const saved = localStorage.getItem(draftKey());
      if (saved) {
        const draft = JSON.parse(saved) as { step: number; responses: Record<string, string> };
        setStep(draft.step);
        setResponses(draft.responses);
      }
    } catch { /* brouillon invalide → ignorer */ }

    // Vérifier si questionnaire déjà soumis aujourd'hui
    void (async () => {
      try {
        const today = await apiClient.get<TodayStatus>('/questionnaire/today');
        if (today.submitted) {
          setTodayResult(today);
          setPageStatus('already-done');
        } else {
          setPageStatus('form');
        }
      } catch {
        // Backend inaccessible → on montre le formulaire quand même
        setPageStatus('form');
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, patient?.id]);

  const handleAnswer = useCallback(async (qId: string, value: string) => {
    const newResponses = { ...responses, [qId]: value };
    const nextStep = step + 1;
    setResponses(newResponses);

    try {
      localStorage.setItem(draftKey(), JSON.stringify({ step: nextStep, responses: newResponses }));
    } catch { /* storage plein */ }

    if (nextStep < questions.length) {
      setStep(nextStep);
      return;
    }

    // Afficher le récapitulatif avant de soumettre
    setShowConfirm(true);
  }, [responses, step, questions]);

  const handleSubmit = useCallback(async () => {
    if (!patient) return;
    setShowConfirm(false);
    setPageStatus('submitting');
    setSubmitError('');

    const payload = {
      responses,
      type:          patient.type,
      pregnancyWeek: patient.pregnancyWeek,
      babyDayOfLife: patient.babyDayOfLife,
    };

    // Hors-ligne : mettre en file d'attente et afficher un résultat provisoire
    if (!isOnline) {
      await queueSubmission('/questionnaire/submit', payload as Record<string, unknown>);
      localStorage.removeItem(draftKey());
      // Résultat fictif "vert" affiché hors-ligne — sync réel dès la reconnexion
      sessionStorage.setItem('mamacare_result', JSON.stringify({
        alertLevel:     'green',
        explanation:    'Vos réponses ont été sauvegardées et seront envoyées dès que vous aurez une connexion.',
        triggeredRules: [],
      }));
      router.push('/result');
      return;
    }

    try {
      const result = await apiClient.post<SubmitResult>('/questionnaire/submit', payload);
      localStorage.removeItem(draftKey());
      sessionStorage.setItem('mamacare_result', JSON.stringify(result));
      router.push('/result');
    } catch {
      setSubmitError('Envoi échoué. Vos réponses sont sauvegardées. Réessayez.');
      setPageStatus('form');
      setShowConfirm(false);
      setStep(questions.length - 1);
    }
  }, [responses, patient, questions.length, router, isOnline, queueSubmission]);

  // ── Rendus conditionnels ──────────────────────────────────────────────────

  if (loading || pageStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-red-600 text-center">{error}</p>
      </div>
    );
  }

  if (pageStatus === 'already-done') {
    const level = todayResult?.alertLevel ?? 'green';
    const levelIcon  = { green: '🟢', orange: '🟠', red: '🔴' }[level] ?? '🟢';
    const levelLabel = { green: 'Tout va bien', orange: 'À surveiller', red: 'Urgence' }[level] ?? 'Tout va bien';
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm flex flex-col gap-3 animate-in">
          {/* Carte principale */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Check-up du jour complété !
            </h2>
            <p className="text-sm text-gray-500">
              Vous avez déjà répondu aujourd&apos;hui.
            </p>
          </div>

          {/* Résultat */}
          <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${LEVEL_COLORS[level] ?? ''}`}>
            <span className="text-2xl">{levelIcon}</span>
            <div>
              <p className="text-sm font-bold">Résultat : {levelLabel}</p>
              <p className="text-xs opacity-80 mt-0.5">Votre dernier check-up</p>
            </div>
          </div>

          {/* Actions */}
          <button
            className="w-full py-4 rounded-xl bg-[#E91E8C] text-white font-semibold text-sm
              hover:bg-[#C9177A] active:scale-[0.98] transition-all shadow-lg shadow-pink-200"
            onClick={() => router.push('/result')}
          >
            Voir mon résultat →
          </button>
          <button
            className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm
              hover:border-[#E91E8C] hover:text-[#E91E8C] active:scale-[0.98] transition-all"
            onClick={() => router.push('/history')}
          >
            Voir mon historique →
          </button>
        </div>
      </div>
    );
  }

  if (pageStatus === 'submitting') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Spinner size="lg" />
        <p className="text-gray-600 text-sm">Analyse en cours…</p>
      </div>
    );
  }

  // ── Écran de confirmation ────────────────────────────────────────────────
  if (showConfirm) {
    const answeredQuestions = questions.filter((q) => responses[q.id]);
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Confirmer vos réponses</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Vérifiez avant d'envoyer. Vous ne pourrez pas modifier après.
          </p>

          <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
            {answeredQuestions.map((q) => {
              const choice = q.choices.find((c) => c.value === responses[q.id]);
              return (
                <div key={q.id} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex-1">{q.text}</span>
                  <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 shrink-0 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
                    {choice?.label ?? responses[q.id]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => { void handleSubmit(); }}
            className="w-full px-5 py-4 rounded-xl bg-[#E91E8C] text-white font-semibold text-sm
              hover:bg-[#C9177A] active:scale-[0.98] transition-all shadow-lg shadow-pink-200"
          >
            Envoyer mes réponses
          </button>
          <button
            onClick={() => { setShowConfirm(false); setStep(questions.length - 1); }}
            className="text-sm text-gray-400 dark:text-gray-500 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors text-center py-2"
          >
            Modifier mes réponses
          </button>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 text-center bg-red-50 rounded-xl p-3">{submitError}</p>
        )}
      </div>
    );
  }

  const question = questions[step];
  if (!question) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const progress = Math.round(((step + 1) / questions.length) * 100);

  // Sync auto : si on revient en ligne avec des soumissions en attente → on les envoie
  // (géré automatiquement par useOfflineQueue)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Bannière hors-ligne ── */}
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700 font-medium">
          <span aria-hidden="true">📵</span>
          Hors ligne — vos réponses seront sauvegardées et envoyées à la reconnexion
        </div>
      )}
      {isOnline && pendingCount > 0 && (
        <button
          type="button"
          onClick={() => { void syncNow(); }}
          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs text-emerald-700 font-medium hover:bg-emerald-100 transition-colors"
        >
          <span aria-hidden="true">🔄</span>
          {pendingCount} réponse{pendingCount > 1 ? 's' : ''} en attente — Synchroniser maintenant
        </button>
      )}

      {/* Barre de progression */}
      <div>
        <div
          className="w-full h-3 bg-gray-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemax={100}
        >
          <div
            className="h-3 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #E91E8C 0%, #f472b6 100%)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-base font-bold text-gray-700 dark:text-gray-300">
            {step + 1} <span className="text-gray-400 dark:text-gray-500 font-normal">/ {questions.length}</span>
          </p>
          {step === 0 && (
            <p className="text-xs text-gray-400">~3 min</p>
          )}
        </div>
      </div>

      <div key={question.id} className="flex flex-col question-slide">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 leading-snug mb-6">
          {question.text}
        </h2>

        <div className="flex flex-col gap-3">
          {question.choices.map((choice) => {
            const isSelected = responses[question.id] === choice.value;
            return (
              <button
                key={choice.value}
                onClick={() => { void handleAnswer(question.id, choice.value); }}
                className={`w-full px-5 py-5 rounded-xl border-2 text-left
                  font-medium transition-all duration-150
                  active:scale-[0.99]
                  focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-2
                  flex items-center justify-between
                  ${isSelected
                    ? 'border-[#E91E8C] bg-[#FDE8F3] dark:bg-pink-950 text-[#C9177A]'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:border-[#E91E8C] hover:bg-[#FDE8F3] dark:hover:bg-pink-950 hover:text-[#C9177A] dark:focus:ring-offset-gray-950'
                  }`}
              >
                <span>{choice.label}</span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-[#E91E8C] flex items-center justify-center shrink-0 fade-in">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3" aria-hidden="true">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {submitError && (
          <p className="mt-5 text-sm text-red-600 text-center bg-red-50 rounded-xl p-3">
            {submitError}
          </p>
        )}
      </div>

      {step > 0 && (
        <button
          className="text-sm text-gray-400 hover:text-[#E91E8C] transition-colors text-center"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          ← Question précédente
        </button>
      )}
    </div>
  );
}
