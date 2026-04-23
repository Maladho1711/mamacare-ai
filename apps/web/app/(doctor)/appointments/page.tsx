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
  postnatal: 'Suivi post-natal',
};

const TYPE_COLOR: Record<Appointment['type'], string> = {
  cpn: 'bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300',
  vaccination: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  ultrasound: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  consultation: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  postnatal: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

function formatDate(iso: string): string {
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

  const grouped = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const key = formatDate(a.scheduledAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    }
    return Array.from(groups.entries());
  }, [filtered]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
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
          title="Aucun rendez-vous"
          description="Crée un rendez-vous pour commencer le suivi."
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, list]) => (
            <section key={date}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                {date}
              </h2>
              <div className="space-y-2">
                {list.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {formatTime(a.scheduledAt)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[a.type]}`}
                          >
                            {TYPE_LABEL[a.type]}
                          </span>
                          {a.status !== 'scheduled' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                              {a.status === 'completed'
                                ? '✓ Honoré'
                                : a.status === 'cancelled'
                                  ? 'Annulé'
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
                      </div>

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
