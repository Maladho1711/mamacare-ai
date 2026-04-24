'use client';

/**
 * --- AppointmentCalendar ----------------------------------------------------
 *
 * Vue calendrier mensuelle des rendez-vous, style Google Calendar mais
 * optimisé mobile. Grille 7×5/6 avec les RDV par jour.
 *
 * Usage :
 *   <AppointmentCalendar appointments={data} onDayClick={(date) => ...} />
 */

import { useMemo, useState } from 'react';

export interface CalendarAppointment {
  id: string;
  scheduledAt: string;
  title: string;
  type: 'cpn' | 'vaccination' | 'ultrasound' | 'consultation' | 'postnatal';
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  patientName?: string;
}

const TYPE_DOT_COLOR: Record<CalendarAppointment['type'], string> = {
  cpn:          'bg-pink-500',
  vaccination:  'bg-blue-500',
  ultrasound:   'bg-purple-500',
  consultation: 'bg-emerald-500',
  postnatal:    'bg-amber-500',
};

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

interface Props {
  appointments: CalendarAppointment[];
  onDayClick?: (date: Date, dayAppointments: CalendarAppointment[]) => void;
}

export default function AppointmentCalendar({ appointments, onDayClick }: Props) {
  const [viewDate, setViewDate] = useState(new Date());

  /** Grille du mois : 42 cases (6 sem × 7 jours), commence au lundi */
  const days = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    // Lun=0, Dim=6 (on veut la semaine commençant par lundi)
    const dayOfWeek = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - dayOfWeek);

    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [viewDate]);

  /** Regroupe les appointments par jour (YYYY-MM-DD) */
  const appointmentsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const a of appointments) {
      const key = new Date(a.scheduledAt).toISOString().split('T')[0];
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [appointments]);

  const today = new Date();
  const todayKey = today.toISOString().split('T')[0];
  const currentMonth = viewDate.getMonth();

  const goPrev = () => setViewDate(new Date(viewDate.getFullYear(), currentMonth - 1, 1));
  const goNext = () => setViewDate(new Date(viewDate.getFullYear(), currentMonth + 1, 1));
  const goToday = () => setViewDate(new Date());

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden">
      {/* Header mois + navigation */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-gray-100">
            {MONTHS[currentMonth]} {viewDate.getFullYear()}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {appointments.length} rendez-vous ce mois
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={goPrev}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Mois précédent"
          >
            ←
          </button>
          <button
            type="button"
            onClick={goToday}
            className="px-3 h-8 rounded-lg text-xs font-semibold text-[#E91E8C] hover:bg-pink-50 dark:hover:bg-pink-950 transition-colors"
          >
            Aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={goNext}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Mois suivant"
          >
            →
          </button>
        </div>
      </div>

      {/* Entêtes jours */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
        {DAYS.map((d) => (
          <div
            key={d}
            className="px-2 py-2 text-center text-[10px] md:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Grille des jours */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayKey = day.toISOString().split('T')[0];
          const dayAppts = appointmentsByDay.get(dayKey) ?? [];
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = dayKey === todayKey;
          const isPast = day < today && !isToday;

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick?.(day, dayAppts)}
              className={`
                group relative aspect-square md:aspect-auto md:min-h-[70px] p-1.5 text-left
                border-r border-b border-gray-100 dark:border-gray-800
                ${idx % 7 === 6 ? 'border-r-0' : ''}
                ${idx >= 35 ? 'border-b-0' : ''}
                ${!isCurrentMonth ? 'bg-gray-50/50 dark:bg-gray-900/50' : ''}
                ${isToday ? 'bg-pink-50/50 dark:bg-pink-950/20' : ''}
                ${dayAppts.length > 0 ? 'cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30' : ''}
                transition-colors
              `}
            >
              {/* Numéro du jour */}
              <div className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold
                ${isToday ? 'bg-[#E91E8C] text-white' : ''}
                ${!isToday && isCurrentMonth ? 'text-gray-900 dark:text-gray-100' : ''}
                ${!isCurrentMonth ? 'text-gray-300 dark:text-gray-600' : ''}
                ${isPast && isCurrentMonth && !isToday ? 'text-gray-400 dark:text-gray-500' : ''}
              `}>
                {day.getDate()}
              </div>

              {/* Pastilles RDV (max 3 visibles + compteur) */}
              {dayAppts.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5">
                  {dayAppts.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      className={`
                        inline-block w-1.5 h-1.5 md:w-2 md:h-2 rounded-full
                        ${TYPE_DOT_COLOR[a.type]}
                        ${a.status !== 'scheduled' ? 'opacity-40' : ''}
                      `}
                      title={`${a.title}${a.patientName ? ` — ${a.patientName}` : ''}`}
                    />
                  ))}
                  {dayAppts.length > 3 && (
                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 ml-0.5">
                      +{dayAppts.length - 3}
                    </span>
                  )}
                </div>
              )}

              {/* Nombre de RDV en petit (desktop uniquement) */}
              {dayAppts.length > 0 && (
                <div className="hidden md:block absolute bottom-1 right-1.5 text-[9px] font-bold text-gray-400 dark:text-gray-500">
                  {dayAppts.length}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-3 p-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 flex-wrap text-[10px] md:text-xs">
        <LegendDot color="bg-pink-500"    label="CPN" />
        <LegendDot color="bg-blue-500"    label="Vaccin" />
        <LegendDot color="bg-purple-500"  label="Écho" />
        <LegendDot color="bg-emerald-500" label="Consult" />
        <LegendDot color="bg-amber-500"   label="Post-natal" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
