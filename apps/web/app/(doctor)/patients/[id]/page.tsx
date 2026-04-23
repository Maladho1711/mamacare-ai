'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import AlertBadge from '@/components/doctor/AlertBadge';
import Spinner from '@/components/ui/Spinner';
import Modal from '@/components/ui/Modal';
import SkeletonPatientDetail from '@/components/doctor/SkeletonPatientDetail';
import { useToast } from '@/components/ui/Toast';

// --- Types --------------------------------------------------------------------

interface PatientApi {
  id:              string;
  fullName:        string;
  phone:           string;
  riskLevel:       string;
  status:          string;
  pregnancyStart:  string;
  expectedTerm:    string;
  notes?:          string;
  isActive?:       boolean;
  archivedAt?:     string | null;
  archiveReason?:  string | null;
}

interface PatientDetail {
  id: string;
  full_name: string;
  phone: string;
  risk_level: string;
  status: string;
  pregnancy_start: string;
  expected_term: string;
  notes: string | null;
  is_active: boolean;
  archived_at: string | null;
  archive_reason: string | null;
}

function mapPatient(p: PatientApi): PatientDetail {
  return {
    id:              p.id,
    full_name:       p.fullName,
    phone:           p.phone,
    risk_level:      p.riskLevel,
    status:          p.status,
    pregnancy_start: p.pregnancyStart,
    expected_term:   p.expectedTerm,
    notes:           p.notes ?? null,
    is_active:       p.isActive !== false, // true par défaut si absent
    archived_at:     p.archivedAt ?? null,
    archive_reason:  p.archiveReason ?? null,
  };
}

interface HistoryEntry {
  id: string;
  submitted_at: string;
  alert_level: string;
  ai_analysis: string | null;
  triggered_rules: string[];
}

interface GridCell {
  date:    Date;
  dateStr: string;
  entry:   HistoryEntry | null;
}

interface AiSummary {
  text: string;
  generatedAt: string;
  cached: boolean;
}

// --- Constantes archivage -----------------------------------------------------

const ARCHIVE_REASONS = [
  'Accouchement',
  'Déménagement',
  'Fausse couche',
  'Décès',
  'Autre',
] as const;

// --- Constantes visuelles -----------------------------------------------------

const LEVEL_DOT: Record<string, string> = {
  green:  'bg-emerald-400',
  orange: 'bg-orange-400',
  red:    'bg-red-500',
};

// Hauteur barre graphique par niveau (F06 — Graphique évolution symptômes)
const BAR_H: Record<string, string> = {
  red:    'h-10',
  orange: 'h-6',
  green:  'h-3',
};

const DETAIL_CARD: Record<string, string> = {
  green:  'bg-emerald-50  border-emerald-200',
  orange: 'bg-orange-50   border-orange-200',
  red:    'bg-red-50      border-red-300',
};

// --- Helpers ------------------------------------------------------------------

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

function pregnancyWeek(start: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 604_800_000));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Numéro E.164 → identifiant wa.me (supprime tout sauf chiffres, garde le + initial) */
function whatsappUrl(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
  return `https://wa.me/${digits}`;
}

function isSubmittedToday(entries: HistoryEntry[]): boolean {
  const today = toDateStr(new Date());
  return entries.some((e) => toDateStr(new Date(e.submitted_at)) === today);
}

function buildGrid(history: HistoryEntry[]): GridCell[] {
  const byDate = new Map<string, HistoryEntry>();
  for (const h of history) {
    const ds = toDateStr(new Date(h.submitted_at));
    if (ds && !byDate.has(ds)) byDate.set(ds, h);
  }
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    d.setHours(0, 0, 0, 0);
    const ds = toDateStr(d);
    return { date: d, dateStr: ds, entry: byDate.get(ds) ?? null };
  });
}

// --- Composant ----------------------------------------------------------------

export default function PatientDetailPage() {
  const router    = useRouter();
  const params    = useParams();
  const patientId = params?.id as string;

  const { showToast } = useToast();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [patient,       setPatient]       = useState<PatientDetail | null>(null);
  const [history,       setHistory]       = useState<HistoryEntry[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [updatingRisk,  setUpdatingRisk]  = useState(false);

  // -- Notes inline editing --
  const [notesEditing,  setNotesEditing]  = useState(false);
  const [notesDraft,    setNotesDraft]    = useState<string>('');
  const [notesSaving,   setNotesSaving]   = useState(false);
  const [notesError,    setNotesError]    = useState<string | null>(null);

  // -- Feature 2.2 — Archivage --
  const [archiveModalOpen,   setArchiveModalOpen]   = useState(false);
  const [archiveReason,      setArchiveReason]      = useState<string>(ARCHIVE_REASONS[0]);
  const [archiving,          setArchiving]          = useState(false);
  const [archiveError,       setArchiveError]       = useState<string | null>(null);
  const [reactivating,       setReactivating]       = useState(false);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // -- Feature 3.2 — Résumé IA --
  const [summary,        setSummary]        = useState<AiSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError,   setSummaryError]   = useState<string>('');

  useEffect(() => {
    if (sessionLoading || !session || !patientId) return;
    let cancelled = false;

    (async () => {
      try {
        const [pat, hist] = await Promise.all([
          apiClient.get<PatientApi>(`/patients/${patientId}`),
          apiClient.get<HistoryEntry[]>(`/questionnaire/history/${patientId}`),
        ]);
        if (cancelled) return;
        setPatient(mapPatient(pat));
        setHistory(hist);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          router.replace('/patients');
          return;
        }
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erreur lors du chargement de la patiente',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, session, patientId, router]);

  // Focus le bouton de confirmation quand la modal s'ouvre
  useEffect(() => {
    if (archiveModalOpen) {
      const t = setTimeout(() => confirmBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [archiveModalOpen]);

  async function saveNotes() {
    if (!patient || notesSaving) return;
    setNotesSaving(true);
    setNotesError(null);
    try {
      await apiClient.patch(`/patients/${patient.id}`, { notes: notesDraft });
      setPatient((p) => (p ? { ...p, notes: notesDraft || null } : p));
      setNotesEditing(false);
      showToast('Notes mises à jour', 'success');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur lors de la sauvegarde';
      setNotesError(msg);
      showToast(msg, 'error');
    } finally {
      setNotesSaving(false);
    }
  }

  function openNotesEdit() {
    setNotesDraft(patient?.notes ?? '');
    setNotesError(null);
    setNotesEditing(true);
  }

  function cancelNotesEdit() {
    setNotesEditing(false);
    setNotesError(null);
  }

  async function updateRiskLevel(level: string) {
    if (!patient || updatingRisk) return;
    setUpdatingRisk(true);
    try {
      await apiClient.patch(`/patients/${patient.id}`, { riskLevel: level });
      setPatient((p) => (p ? { ...p, risk_level: level } : p));
    } catch {
      /* silencieux */
    }
    setUpdatingRisk(false);
  }

  // -- Feature 2.2 — Handlers archivage --

  function openArchiveModal() {
    setArchiveReason(ARCHIVE_REASONS[0]);
    setArchiveError(null);
    setArchiveModalOpen(true);
  }

  function closeArchiveModal() {
    if (archiving) return;
    setArchiveModalOpen(false);
    setArchiveError(null);
  }

  async function confirmArchive() {
    if (!patient || archiving) return;
    setArchiving(true);
    setArchiveError(null);
    try {
      await apiClient.patch(`/patients/${patient.id}/archive`, { reason: archiveReason });
      setArchiveModalOpen(false);
      showToast('Patiente archivée', 'info');
      router.push('/patients');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur lors de l\'archivage';
      setArchiveError(msg);
      showToast(msg, 'error');
      setArchiving(false);
    }
  }

  async function reactivatePatient() {
    if (!patient || reactivating) return;
    setReactivating(true);
    try {
      await apiClient.patch(`/patients/${patient.id}/reactivate`, {});
      setPatient((p) =>
        p ? { ...p, is_active: true, archived_at: null, archive_reason: null } : p,
      );
      showToast('Patiente réactivée', 'success');
    } catch {
      showToast('Erreur lors de la réactivation', 'error');
    } finally {
      setReactivating(false);
    }
  }

  // -- Feature 3.2 — Résumé IA --

  async function loadSummary() {
    if (!patient || summaryLoading) return;
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const data = await apiClient.get<{ summary: string; generatedAt: string; cached: boolean }>(
        `/patients/${patient.id}/summary`,
      );
      setSummary({ text: data.summary, generatedAt: data.generatedAt, cached: data.cached });
    } catch {
      setSummaryError('Impossible de générer le résumé.');
    } finally {
      setSummaryLoading(false);
    }
  }

  // -------------------------------------------------------------------------

  if (loading || sessionLoading) {
    return <SkeletonPatientDetail />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    );
  }

  if (!patient) return null;

  const grid          = buildGrid(history);
  const today         = toDateStr(new Date());
  const checkedToday  = isSubmittedToday(history);
  const week          = pregnancyWeek(patient.pregnancy_start);
  const firstPrenom   = patient.full_name.split(' ')[0] ?? patient.full_name;

  return (
    <div className="flex flex-col gap-5">

      {/* -- En-tête de la fiche -- */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/patients')}
            className="shrink-0 text-sm text-gray-400 dark:text-gray-500 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors"
          >
            ← Retour
          </button>
          <h1 className="text-base font-bold text-gray-800 dark:text-gray-100 truncate">{patient.full_name}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/patients/${patient.id}/edit`)}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors px-2 py-1"
          >
            Modifier
          </button>
          <AlertBadge level={patient.risk_level} />
        </div>
      </div>


        {/* -- Carte identité -- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-4">

          {/* -- Feature 2.2 — Bandeau archivage -- */}
          {!patient.is_active && (
            <div className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <span aria-hidden="true" className="shrink-0 text-base leading-snug">🗃️</span>
              <p className="text-xs text-red-700 leading-relaxed">
                <span className="font-semibold">Patiente archivée</span>
                {patient.archived_at && (
                  <> le {fmtDate(patient.archived_at)}</>
                )}
                {patient.archive_reason && (
                  <> — Raison&nbsp;: {patient.archive_reason}</>
                )}
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <InfoItem label="Téléphone" value={patient.phone} />
            <InfoItem
              label="Statut"
              value={patient.status === 'postnatal' ? 'Post-natal' : 'Grossesse'}
            />
            <InfoItem
              label={patient.status !== 'postnatal' ? 'Semaine d\'aménorrhée' : 'DDR'}
              value={patient.status !== 'postnatal' ? `SA ${week}` : fmtDate(patient.pregnancy_start)}
            />
            <InfoItem label="Terme prévu" value={fmtDate(patient.expected_term)} />
          </div>

          {/* -- Notes cliniques — édition inline -- */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">
                Notes cliniques
              </p>
              {!notesEditing && (
                <button
                  type="button"
                  onClick={openNotesEdit}
                  className="text-xs text-gray-400 hover:text-[#E91E8C] transition-colors
                    px-2 py-0.5 rounded-lg hover:bg-pink-50 focus:outline-none
                    focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-1"
                  aria-label="Modifier les notes cliniques"
                >
                  Modifier
                </button>
              )}
            </div>

            {notesEditing ? (
              /* -- État édition -- */
              <div className="flex flex-col gap-2 mt-1">
                <div className="relative">
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value.slice(0, 1000))}
                    rows={4}
                    maxLength={1000}
                    disabled={notesSaving}
                    placeholder="Saisir des notes cliniques..."
                    className="w-full resize-none rounded-lg border border-gray-200 bg-white
                      px-3 py-2 text-sm text-gray-700 leading-relaxed
                      placeholder:text-gray-300
                      focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-150"
                  />
                  <span className="absolute bottom-2 right-2 text-[10px] text-gray-300 select-none">
                    {notesDraft.length}/1000
                  </span>
                </div>

                {notesError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {notesError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={notesSaving}
                    onClick={() => { void saveNotes(); }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl
                      bg-[#E91E8C] text-white text-xs font-semibold
                      hover:bg-[#d01880] active:scale-[0.98]
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-150 focus:outline-none focus:ring-2
                      focus:ring-[#E91E8C] focus:ring-offset-2"
                  >
                    {notesSaving ? (
                      <>
                        <Spinner size="sm" />
                        Sauvegarde...
                      </>
                    ) : (
                      'Sauvegarder'
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={notesSaving}
                    onClick={cancelNotesEdit}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold
                      text-gray-500 hover:border-gray-300 hover:text-gray-700
                      disabled:opacity-50 disabled:cursor-not-allowed
                      transition-all duration-150 focus:outline-none focus:ring-2
                      focus:ring-gray-300 focus:ring-offset-2"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : patient.notes ? (
              /* -- État lecture avec contenu -- */
              <p className="text-sm text-gray-600 leading-relaxed">{patient.notes}</p>
            ) : (
              /* -- État vide -- */
              <button
                type="button"
                onClick={openNotesEdit}
                className="text-sm text-gray-400 hover:text-[#E91E8C] transition-colors
                  focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-1
                  rounded"
              >
                Aucune note — Ajouter une note
              </button>
            )}
          </div>

          <div className={`
            flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold
            ${checkedToday ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}
          `}>
            <span aria-hidden="true">{checkedToday ? '✅' : '⏳'}</span>
            {checkedToday
              ? 'Questionnaire rempli aujourd\'hui'
              : 'Questionnaire non rempli aujourd\'hui'
            }
          </div>
        </div>

        {/* -- Feature 3.2 — Résumé IA 7 jours -- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">
              Résumé IA — 7 derniers jours
            </p>
            {summary && !summaryLoading && (
              <button
                type="button"
                onClick={() => { void loadSummary(); }}
                className="text-xs text-gray-400 hover:text-[#E91E8C] transition-colors
                  px-2 py-1 rounded-lg hover:bg-pink-50 flex items-center gap-1
                  focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-1"
                aria-label="Régénérer le résumé IA"
              >
                <span aria-hidden="true">🔄</span>
                Régénérer
              </button>
            )}
          </div>

          {/* État : loading */}
          {summaryLoading && (
            <div className="flex items-center gap-3 py-4">
              <Spinner size="sm" />
              <p className="text-sm text-gray-500">Analyse en cours...</p>
            </div>
          )}

          {/* État : erreur */}
          {!summaryLoading && summaryError && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">
                {summaryError}
              </p>
              <button
                type="button"
                onClick={() => { void loadSummary(); }}
                className="self-start text-xs text-gray-500 hover:text-[#E91E8C]
                  transition-colors focus:outline-none focus:ring-2
                  focus:ring-[#E91E8C] focus:ring-offset-1 rounded px-1"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* État : résumé disponible */}
          {!summaryLoading && !summaryError && summary && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{summary.text}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400">
                  Généré le {fmtDate(summary.generatedAt)}
                </span>
                {summary.cached && (
                  <span className="text-[10px] text-gray-300">• depuis le cache</span>
                )}
              </div>
            </div>
          )}

          {/* État : pas encore chargé */}
          {!summaryLoading && !summaryError && !summary && (
            <button
              type="button"
              onClick={() => { void loadSummary(); }}
              className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200
                text-sm text-gray-400 font-medium
                hover:border-[#E91E8C] hover:text-[#E91E8C] hover:bg-pink-50
                active:scale-[0.99] transition-all duration-150
                flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:ring-offset-2"
            >
              <span aria-hidden="true">🤖</span>
              Générer le résumé IA
            </button>
          )}
        </div>

        {/* -- Graphique évolution 30 jours (F06) -- */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wide">
              Évolution — 30 derniers jours
            </p>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Stable</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Surveiller</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Urgence</span>
            </div>
          </div>

          {/* Barres SVG — zéro dépendance, fonctionne hors-ligne */}
          <div className="flex items-end gap-px h-12" role="img" aria-label="Graphique évolution symptômes">
            {grid.map((cell) => {
              const level  = cell.entry?.alert_level;
              const barH   = level ? (BAR_H[level]   ?? 'h-3')  : 'h-1';
              const barBg  = level ? (LEVEL_DOT[level] ?? 'bg-gray-300') : 'bg-gray-200';
              const isSelected = selectedEntry?.id === cell.entry?.id && cell.entry !== null;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={!cell.entry}
                  onClick={() => cell.entry && setSelectedEntry(isSelected ? null : cell.entry)}
                  title={`${fmtDayMonth(cell.date)}${level ? ` — ${level}` : ' — non rempli'}`}
                  className={`
                    flex-1 ${barH} ${barBg} rounded-sm transition-all
                    ${cell.entry ? 'cursor-pointer hover:opacity-70' : 'cursor-default'}
                    ${isSelected ? 'opacity-60 ring-1 ring-[#E91E8C]' : ''}
                  `}
                />
              );
            })}
          </div>

          {/* Étiquettes J-30 / Aujourd'hui */}
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-gray-400">J-30</span>
            <span className="text-[10px] text-gray-400">Aujourd'hui</span>
          </div>
        </div>

        {/* -- Calendrier 30 jours -- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-4">
            Questionnaires
          </p>

          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Calendrier 30 jours">
            {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>
            ))}

            {/* Décalage premier jour */}
            {Array.from({
              length: grid[0]?.date.getDay() === 0 ? 6 : (grid[0]?.date.getDay() ?? 1) - 1,
            }).map((_, i) => <div key={`sp-${i}`} />)}

            {grid.map((cell) => {
              const isToday    = cell.dateStr === today;
              const level      = cell.entry?.alert_level;
              const dot        = level ? (LEVEL_DOT[level] ?? 'bg-gray-300') : 'bg-gray-200';
              const isSelected = selectedEntry?.id === cell.entry?.id && cell.entry !== null;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  aria-label={`${fmtDayMonth(cell.date)}${level ? `, niveau ${level}` : ', non rempli'}`}
                  aria-pressed={isSelected}
                  onClick={() => cell.entry && setSelectedEntry(isSelected ? null : cell.entry)}
                  className={`
                    flex flex-col items-center justify-center aspect-square rounded-xl
                    transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]
                    ${cell.entry ? 'cursor-pointer hover:opacity-75 active:scale-90' : 'cursor-default opacity-40'}
                    ${isToday    ? 'ring-2 ring-[#E91E8C] ring-offset-1' : ''}
                    ${isSelected ? 'scale-90 opacity-80' : ''}
                  `}
                >
                  <span className={`w-6 h-6 rounded-full ${dot} mb-0.5`} />
                  <span className="text-[9px] text-gray-500 font-medium">{cell.date.getDate()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* -- Détail entrée sélectionnée -- */}
        {selectedEntry && (
          <div className={`rounded-2xl border p-5 flex flex-col gap-3 ${DETAIL_CARD[selectedEntry.alert_level] ?? 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm capitalize">
                {new Date(selectedEntry.submitted_at).toLocaleDateString('fr-FR', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })}
              </h2>
              <AlertBadge level={selectedEntry.alert_level} />
            </div>

            {selectedEntry.ai_analysis && (
              <p className="text-sm text-gray-700 leading-relaxed">{selectedEntry.ai_analysis}</p>
            )}

            {selectedEntry.triggered_rules.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 uppercase font-semibold tracking-wide mb-2">
                  Signes détectés
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedEntry.triggered_rules.map((r) => (
                    <span
                      key={r}
                      className="text-xs px-2.5 py-1 bg-white bg-opacity-70 text-gray-700
                        rounded-full border border-gray-200"
                    >
                      {r.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* -- Ajuster niveau risque -- */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">
            Niveau de risque (ajustement manuel)
          </p>
          <div className="flex gap-2">
            {(['green', 'orange', 'red'] as const).map((l) => (
              <button
                key={l}
                type="button"
                disabled={updatingRisk || patient.risk_level === l}
                onClick={() => { void updateRiskLevel(l); }}
                className={`
                  flex-1 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                  ${patient.risk_level === l
                    ? l === 'green'  ? 'border-emerald-400 bg-emerald-50  text-emerald-800'
                    : l === 'orange' ? 'border-orange-400  bg-orange-50   text-orange-800'
                    :                  'border-red-400     bg-red-50      text-red-800'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300'
                  }
                `}
              >
                {l === 'green' ? '✅ Stable' : l === 'orange' ? '⚠️ Surveiller' : '🚨 Urgence'}
              </button>
            ))}
          </div>
        </div>

        {/* -- Actions contact (F06 — Bouton WhatsApp direct) -- */}
        <div className="flex gap-3">
          <a
            href={whatsappUrl(patient.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-xl
              bg-[#25D366] text-white font-semibold text-sm
              hover:bg-[#20bd5a] active:scale-[0.98]
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
          >
            {/* WhatsApp SVG icon inline — pas de lib icon */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .916.948l5.703-1.492A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.692 9.692 0 0 1-5.003-1.389l-.358-.214-3.722.974.993-3.63-.233-.374A9.714 9.714 0 0 1 2.25 12c0-5.376 4.374-9.75 9.75-9.75S21.75 6.624 21.75 12 17.376 21.75 12 21.75z"/>
            </svg>
            WhatsApp {firstPrenom}
          </a>

          <a
            href={`tel:${patient.phone}`}
            className="px-4 py-4 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm
              hover:border-gray-300 active:scale-[0.98]
              transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2
              flex items-center gap-1.5"
          >
            <span aria-hidden="true">📞</span>
            Appeler
          </a>
        </div>

        {/* -- Feature 2.2 — Bouton archiver / réactiver -- */}
        <div className="pb-2">
          {patient.is_active ? (
            <button
              type="button"
              onClick={openArchiveModal}
              className="w-full py-3.5 rounded-xl border-2 border-red-200 text-red-600
                text-sm font-semibold
                hover:bg-red-50 hover:border-red-300 active:scale-[0.99]
                transition-all duration-150
                flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
            >
              <span aria-hidden="true">🗃️</span>
              Archiver la patiente
            </button>
          ) : (
            <button
              type="button"
              disabled={reactivating}
              onClick={() => { void reactivatePatient(); }}
              className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-600
                text-sm font-semibold
                hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150
                flex items-center justify-center gap-2
                focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
            >
              {reactivating ? (
                <>
                  <Spinner size="sm" />
                  Réactivation...
                </>
              ) : (
                <>
                  <span aria-hidden="true">♻️</span>
                  Réactiver la patiente
                </>
              )}
            </button>
          )}
        </div>

      {/* -- Feature 2.2 — Modal de confirmation d'archivage -- */}
      <Modal
        open={archiveModalOpen}
        onClose={closeArchiveModal}
        title="Archiver la patiente ?"
        actions={
          <>
            <button
              type="button"
              disabled={archiving}
              onClick={closeArchiveModal}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold
                text-gray-500 hover:border-gray-300 hover:text-gray-700
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 focus:outline-none focus:ring-2
                focus:ring-gray-300 focus:ring-offset-2"
            >
              Annuler
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              disabled={archiving}
              onClick={() => { void confirmArchive(); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl
                bg-red-600 text-white text-sm font-semibold
                hover:bg-red-700 active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150 focus:outline-none focus:ring-2
                focus:ring-red-500 focus:ring-offset-2"
            >
              {archiving ? (
                <>
                  <Spinner size="sm" />
                  Archivage...
                </>
              ) : (
                'Confirmer l\'archivage'
              )}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-gray-600 text-sm leading-relaxed">
            Cette patiente n'apparaîtra plus dans votre dashboard actif.
          </p>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="archive-reason"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Raison
            </label>
            <select
              id="archive-reason"
              value={archiveReason}
              onChange={(e) => setArchiveReason(e.target.value)}
              disabled={archiving}
              className="w-full rounded-xl border border-gray-200 bg-white
                px-3 py-2.5 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-150"
            >
              {ARCHIVE_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {archiveError && (
            <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">
              {archiveError}
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

// --- InfoItem -----------------------------------------------------------------

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-800 dark:text-gray-100 font-semibold mt-0.5">{value}</p>
    </div>
  );
}
