'use client';

/**
 * --- Page Rendez-vous (médecin) --------------------------------------------
 *
 * Liste tous les RDV à venir, groupés par date, avec création rapide.
 * - Filtre À venir / Passés / Tous
 * - Création via modale simple
 * - Clic sur un RDV → marquer honoré / annuler
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import EmptyState from '@/components/ui/EmptyState';
import FilterChip from '@/components/ui/FilterChip';
import { useToast } from '@/components/ui/Toast';

interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  type: 'cpn' | 'vaccination' | 'ultrasound' | 'consultation' | 'postnatal';
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string | null;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes: string | null;
}

interface PatientRow {
  id: string;
  fullName: string;
}

type FilterKey = 'upcoming' | 'past' | 'all';

const TYPE_LABEL: Record<Appointment['type'], string> = {
  cpn: 'CPN',
  vaccination: 'Vaccination',
  ultrasound: 'Échographie',
  consultation: 'Consultation',
  postnatal: 'Post-natal',
};

const TYPE_COLOR: Record<Appointment['type'], string> = {
  cpn: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  vaccination: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  ultrasound: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  consultation: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  postnatal: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

/** Emoji discret associé à chaque type de consultation — lecture rapide mobile */
const TYPE_ICON: Record<Appointment['type'], string> = {
  cpn: '🤰',
  vaccination: '💉',
  ultrasound: '🔬',
  consultation: '🩺',
  postnatal: '👶',
};

function formatDateLong(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Regroupe les RDV par période relative : Aujourd'hui, Demain, Cette semaine, Plus tard.
 * Bien plus lisible qu'un regroupement par date absolue pour le médecin.
 */
function bucketOf(iso: string): { key: string; label: string; order: number } {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const endOfWeek = new Date(today);
  endOfWeek.setDate(today.getDate() + 7);

  const d = new Date(iso);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);

  if (dayStart.getTime() < today.getTime()) {
    return { key: 'past', label: '📋 Passés', order: 4 };
  }
  if (dayStart.getTime() === today.getTime()) {
    return { key: 'today', label: "🔥 Aujourd'hui", order: 0 };
  }
  if (dayStart.getTime() === tomorrow.getTime()) {
    return { key: 'tomorrow', label: '⏰ Demain', order: 1 };
  }
  if (dayStart.getTime() < endOfWeek.getTime()) {
    return { key: 'week', label: '📅 Cette semaine', order: 2 };
  }
  return { key: 'later', label: '🗓️ Plus tard', order: 3 };
}

export default function AppointmentsPage() {
  useSession({ required: true, requireRole: 'doctor' });
  const toast = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('upcoming');
  const [modalOpen, setModalOpen] = useState(false);

  const [form, setForm] = useState({
    patientId: '',
    type: 'cpn' as Appointment['type'],
    title: '',
    scheduledAt: '',
    location: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [appts, pats] = await Promise.all([
        apiClient.get<Appointment[]>('/appointments'),
        apiClient.get<PatientRow[]>('/patients'),
      ]);
      setAppointments(appts);
      setPatients(pats);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur de chargement';
      toast.showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return appointments
      .filter((a) => {
        const t = new Date(a.scheduledAt).getTime();
        if (filter === 'upcoming') return t >= now && a.status === 'scheduled';
        if (filter === 'past') return t < now || a.status !== 'scheduled';
        return true;
      })
      .sort((a, b) => {
        const da = new Date(a.scheduledAt).getTime();
        const db = new Date(b.scheduledAt).getTime();
        return filter === 'past' ? db - da : da - db;
      });
  }, [appointments, filter]);

  /** Regroupement intelligent par période relative (Aujourd'hui/Demain/…) */
  const grouped = useMemo(() => {
    const groups = new Map<string, { label: string; order: number; items: Appointment[] }>();
    for (const a of filtered) {
      const bucket = bucketOf(a.scheduledAt);
      if (!groups.has(bucket.key)) {
        groups.set(bucket.key, { label: bucket.label, order: bucket.order, items: [] });
      }
      groups.get(bucket.key)!.items.push(a);
    }
    return Array.from(groups.values()).sort((a, b) => a.order - b.order);
  }, [filtered]);

  /** KPIs en-tête : aujourd'hui, à venir 7j, en retard/annulé */
  const stats = useMemo(() => {
    const now = Date.now();
    const in7 = now + 7 * 86_400_000;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = todayStart.getTime() + 86_400_000;
    return {
      today: appointments.filter((a) => {
        const t = new Date(a.scheduledAt).getTime();
        return t >= todayStart.getTime() && t < todayEnd && a.status === 'scheduled';
      }).length,
      upcoming: appointments.filter((a) => {
        const t = new Date(a.scheduledAt).getTime();
        return t >= now && t < in7 && a.status === 'scheduled';
      }).length,
      completed: appointments.filter((a) => a.status === 'completed').length,
    };
  }, [appointments]);

  const patientName = (id: string) =>
    patients.find((p) => p.id === id)?.fullName ?? 'Patiente inconnue';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.title || !form.scheduledAt) {
      toast.showToast('Patiente, titre et date requis', 'error');
      return;
    }
    setSaving(true);
    try {
      const iso = new Date(form.scheduledAt).toISOString();
      await apiClient.post('/appointments', {
        patientId: form.patientId,
        type: form.type,
        title: form.title,
        scheduledAt: iso,
        location: form.location || undefined,
        description: form.description || undefined,
      });
      toast.showToast('Rendez-vous créé', 'success');
      setModalOpen(false);
      setForm({
        patientId: '',
        type: 'cpn',
        title: '',
        scheduledAt: '',
        location: '',
        description: '',
      });
      await load();
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Échec création';
      toast.showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await apiClient.patch(`/appointments/${id}`, { status: 'completed' });
      toast.showToast('RDV marqué honoré', 'success');
      await load();
    } catch {
      toast.showToast('Échec mise à jour', 'error');
    }
  };

  const markCancelled = async (id: string) => {
    if (!confirm('Annuler ce rendez-vous ?')) return;
    try {
      await apiClient.patch(`/appointments/${id}`, { status: 'cancelled' });
      toast.showToast('RDV annulé', 'success');
      await load();
    } catch {
      toast.showToast('Échec annulation', 'error');
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero — gradient subtil + KPIs intégrés */}
      <div className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-gray-900 rounded-2xl border border-pink-100 dark:border-pink-950 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
              Rendez-vous
            </h1>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Rappels SMS automatiques la veille pour vos patientes
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
            + Nouveau
          </Button>
        </div>
        {/* KPIs inline */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Aujourd&apos;hui</p>
            <p className="text-2xl font-bold text-[#E91E8C] mt-0.5">{stats.today}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">7 jours</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{stats.upcoming}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
            <p className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">Honorés</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* Header original caché — remplacé par le hero ci-dessus */}
      <div className="hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Rendez-vous
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            CPN, vaccinations, consultations — rappels SMS automatiques la veille
          </p>
        </div>
        <Button variant="primary" onClick={() => setModalOpen(true)}>
          + Nouveau
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <FilterChip
          label="À venir"
          active={filter ==='upcoming'}
          onClick={() => setFilter('upcoming')}
        />
        <FilterChip
          label="Passés"
          active={filter ==='past'}
          onClick={() => setFilter('past')}
        />
        <FilterChip
          label="Tous"
          active={filter ==='all'}
          onClick={() => setFilter('all')}
        />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Aucun rendez-vous"
          description={
            filter === 'upcoming'
              ? "Aucun RDV à venir. Crée-en un pour commencer le suivi de tes patientes."
              : filter === 'past'
                ? 'Aucun rendez-vous passé pour le moment.'
                : 'Crée un premier rendez-vous pour démarrer.'
          }
          action={
            filter === 'upcoming' ? (
              <Button size="sm" onClick={() => setModalOpen(true)}>+ Créer un RDV</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {group.label}
                </h2>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">
                  {group.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {group.items.map((a) => (
                  <div
                    key={a.id}
                    className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-pink-200 dark:hover:border-pink-900 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 flex gap-3">
                        {/* Colonne heure/date visible en 1 clin d'oeil */}
                        <div className="shrink-0 text-center">
                          <div className="text-2xl mb-0.5" aria-hidden="true">{TYPE_ICON[a.type]}</div>
                          <div className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-none">
                            {formatTime(a.scheduledAt)}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-none">
                            {new Date(a.scheduledAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </div>
                        </div>
                        {/* Contenu principal */}
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_COLOR[a.type]}`}
                          >
                            {TYPE_LABEL[a.type]}
                          </span>
                          {a.status !== 'scheduled' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {a.status === 'completed'
                                ? '✓ Honoré'
                                : a.status === 'cancelled'
                                  ? '✕ Annulé'
                                  : 'Manqué'}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm font-medium text-gray-800 dark:text-gray-200">
                          {a.title}
                        </div>
                        <Link
                          href={`/patients/${a.patientId}`}
                          className="text-sm text-[#E91E8C] hover:underline"
                        >
                          {patientName(a.patientId)}
                        </Link>
                        {a.location && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            📍 {a.location}
                          </div>
                        )}
                        {a.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {a.description}
                          </p>
                        )}
                        </div>{/* close content wrapper */}
                      </div>{/* close flex-1 flex gap-3 */}

                      {a.status === 'scheduled' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => markCompleted(a.id)}
                            className="px-3 py-1 text-xs rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900"
                          >
                            Honoré
                          </button>
                          <button
                            type="button"
                            onClick={() => markCancelled(a.id)}
                            className="px-3 py-1 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Annuler
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Modale création */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau rendez-vous"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Patiente
            </label>
            <select
              value={form.patientId}
              onChange={(e) => setForm({ ...form, patientId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
              required
            >
              <option value="">— Sélectionner —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.fullName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type
            </label>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as Appointment['type'] })
              }
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            >
              {Object.entries(TYPE_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Titre"
            placeholder="CPN 2 — Mesure TA, poids"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date et heure
            </label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
              required
            />
          </div>

          <Input
            label="Lieu (optionnel)"
            placeholder="CS de Pita"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setModalOpen(false)}
              fullWidth
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={saving} fullWidth>
              Créer
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
