/**
 * ─── MamaCare Edge Function — API unifiée ─────────────────────────────────────
 *
 * Remplace l'ancien backend NestJS (apps/api). Une seule Edge Function Deno
 * route toutes les requêtes vers les handlers appropriés.
 *
 * URL publique : ${SUPABASE_URL}/functions/v1/api/<route>
 * Ex : ${SUPABASE_URL}/functions/v1/api/patients
 *
 * Routes :
 *   POST   /auth/send-otp
 *   POST   /auth/verify-otp
 *   POST   /auth/dev-login
 *   GET    /auth/me
 *
 *   GET    /patients
 *   POST   /patients
 *   GET    /patients/:id
 *   PATCH  /patients/:id
 *   POST   /patients/:id/archive
 *   GET    /patients/:id/summary
 *
 *   POST   /questionnaire/submit
 *   GET    /questionnaire/today-status
 *   GET    /questionnaire/my-history
 *   GET    /questionnaire/history/:patientId
 *
 *   GET    /appointments
 *   POST   /appointments
 *   PATCH  /appointments/:id
 *   DELETE /appointments/:id
 *
 *   GET    /alerts
 *   POST   /alerts/:id/resolve
 *
 *   POST   /notifications/subscribe
 *   POST   /notifications/send-daily-reminders   (cron → x-internal-secret)
 */

import { CORS_HEADERS, corsResponse, json, err } from './_shared/cors.ts';
import { getAuthUser, requireAuth, requireDoctor, requirePatient, AuthUser } from './_shared/auth.ts';
import { makeAdminClient } from './_shared/supabase.ts';
import { isDevMode, signDevToken, DEV_PROFILES, DevRole } from './_shared/dev-mode.ts';
import { evaluateWhoRules, EvaluationContext } from './_shared/who-rules.ts';
import type { AlertLevel } from './_shared/who-rules.ts';
import {
  generateExplanation,
  generatePatientSummary,
  SummaryHistoryEntry,
} from './_shared/claude.ts';
import { sendWhatsAppAlert } from './_shared/whatsapp.ts';
import { sendSms } from './_shared/sms.ts';

const PWA_URL = Deno.env.get('PWA_URL') ?? 'https://mamacare-ai.vercel.app';

// ─── Router principal ────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const url = new URL(req.url);
    // Extrait le path après "/api" : "/functions/v1/api/patients/123" → "/patients/123"
    const match = url.pathname.match(/\/api(\/.*)?$/);
    const path = match?.[1] ?? '/';

    const response = await route(req, path, url);
    return response;
  } catch (e) {
    // Les helpers requireAuth/requireDoctor jettent un Response en cas d'échec
    if (e instanceof Response) {
      // Ré-ajoute les headers CORS
      const body = await e.text();
      return new Response(body, {
        status: e.status,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    console.error('[api] unhandled', e);
    return err('Erreur serveur interne', 500);
  }
});

// ─── Table de routage ────────────────────────────────────────────────────────

async function route(req: Request, path: string, url: URL): Promise<Response> {
  const method = req.method;

  // ─── Health / racine ──────────────────────────────────────────────────────
  if (path === '/' || path === '') {
    return json({ status: 'ok', service: 'mamacare-api', version: '2.0-edge' });
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────
  if (path === '/auth/send-otp' && method === 'POST') return handleSendOtp(req);
  if (path === '/auth/verify-otp' && method === 'POST') return handleVerifyOtp(req);
  if (path === '/auth/dev-login' && method === 'POST') return handleDevLogin(req);
  if (path === '/auth/me' && method === 'GET') return handleMe(req);

  // ─── PATIENTS ──────────────────────────────────────────────────────────────
  if (path === '/patients' && method === 'GET') return listPatients(req, url);
  if (path === '/patients' && method === 'POST') return createPatient(req);
  let m = path.match(/^\/patients\/([^/]+)$/);
  if (m && method === 'GET') return getPatient(req, m[1]);
  if (m && method === 'PATCH') return updatePatient(req, m[1]);
  m = path.match(/^\/patients\/([^/]+)\/archive$/);
  if (m && method === 'POST') return archivePatient(req, m[1]);
  m = path.match(/^\/patients\/([^/]+)\/summary$/);
  if (m && method === 'GET') return getPatientSummary(req, m[1]);

  // ─── QUESTIONNAIRE ─────────────────────────────────────────────────────────
  if (path === '/questionnaire/submit' && method === 'POST') return submitQuestionnaire(req);
  if (path === '/questionnaire/today-status' && method === 'GET') return getTodayStatus(req);
  if (path === '/questionnaire/my-history' && method === 'GET') return getMyHistory(req);
  m = path.match(/^\/questionnaire\/history\/([^/]+)$/);
  if (m && method === 'GET') return getHistory(req, m[1]);

  // ─── APPOINTMENTS ──────────────────────────────────────────────────────────
  if (path === '/appointments' && method === 'GET') return listAppointments(req, url);
  if (path === '/appointments' && method === 'POST') return createAppointment(req);
  m = path.match(/^\/appointments\/([^/]+)$/);
  if (m && method === 'PATCH') return updateAppointment(req, m[1]);
  if (m && method === 'DELETE') return deleteAppointment(req, m[1]);

  // ─── ALERTS ────────────────────────────────────────────────────────────────
  if (path === '/alerts' && method === 'GET') return listAlerts(req);
  m = path.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (m && method === 'POST') return resolveAlert(req, m[1]);

  // ─── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (path === '/notifications/vapid-public-key' && method === 'GET') return getVapidPublicKey();
  if (path === '/notifications/subscribe' && method === 'POST') return subscribePush(req);
  if (path === '/notifications/unsubscribe' && method === 'POST' || path === '/notifications/unsubscribe' && method === 'DELETE') return unsubscribePush(req);
  if (path === '/notifications/send-daily-reminders' && method === 'POST') return sendDailyReminders(req);

  return err(`Route non trouvée : ${method} ${path}`, 404);
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function handleSendOtp(req: Request): Promise<Response> {
  const { phone } = await req.json().catch(() => ({ phone: null }));
  if (!phone) return err('Téléphone requis');

  if (isDevMode()) return json({ sent: true });

  const admin = makeAdminClient();
  const { error } = await admin.auth.signInWithOtp({ phone, options: { channel: 'sms' } });
  if (error) return err(error.message ?? "Impossible d'envoyer le code OTP", 401);
  return json({ sent: true });
}

async function handleVerifyOtp(req: Request): Promise<Response> {
  const { phone, token } = await req.json().catch(() => ({ phone: null, token: null }));
  if (!phone || !token) return err('Téléphone et code requis');

  if (isDevMode()) {
    // En dev : redirection vers dev-login patient par défaut
    const accessToken = await signDevToken('patient');
    const profile = DEV_PROFILES['patient'];
    const now = new Date().toISOString();
    return json({
      accessToken,
      profile: { id: profile.sub, role: profile.role, full_name: profile.full_name, phone: profile.phone, created_at: now, updated_at: now },
    });
  }

  const admin = makeAdminClient();
  const { data, error } = await admin.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error || !data.user || !data.session) return err(error?.message ?? 'Code OTP invalide', 401);

  const { data: profile } = await admin
    .from('profiles')
    .select('id, role, full_name, phone, created_at, updated_at')
    .eq('id', data.user.id)
    .single();

  if (!profile) return err('Profil utilisateur introuvable', 401);
  return json({ accessToken: data.session.access_token, profile });
}

async function handleDevLogin(req: Request): Promise<Response> {
  if (!isDevMode()) return err('Dev login désactivé en production', 401);

  const { role = 'patient' } = await req.json().catch(() => ({ role: 'patient' }));
  if (role !== 'doctor' && role !== 'patient') return err('Role invalide');

  const accessToken = await signDevToken(role as DevRole);
  const profile = DEV_PROFILES[role as DevRole];
  const now = new Date().toISOString();
  return json({
    accessToken,
    profile: {
      id: profile.sub,
      role: profile.role,
      full_name: profile.full_name,
      phone: profile.phone,
      created_at: now,
      updated_at: now,
    },
  });
}

async function handleMe(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const now = new Date().toISOString();
  return json({
    id: user.id,
    role: user.role,
    full_name: user.full_name,
    phone: user.phone,
    created_at: now,
    updated_at: now,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// PATIENTS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function mapPatientRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    userId: row.user_id,
    doctorId: row.doctor_id,
    fullName: row.full_name,
    phone: row.phone,
    pregnancyStart: row.pregnancy_start,
    expectedTerm: row.expected_term,
    status: row.status,
    riskLevel: row.risk_level,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isActive: row.is_active,
    archivedAt: row.archived_at,
    archiveReason: row.archive_reason,
    lastSubmittedAt: row.last_submitted_at ?? null,
  };
}

const RISK_PRIORITY: Record<string, number> = { red: 0, orange: 1, green: 2 };

async function listPatients(req: Request, url: URL): Promise<Response> {
  const user = await requireAuth(req);
  const admin = makeAdminClient();
  const includeArchived = url.searchParams.get('includeArchived') === 'true';

  // Doctor → ses patientes ; Patient → uniquement elle-même
  let query = admin.from('patients').select('*');
  if (user.role === 'doctor') {
    query = query.eq('doctor_id', user.id);
  } else {
    query = query.eq('user_id', user.id);
  }
  if (!includeArchived) query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return err(error.message, 500);

  // Enrichir avec la dernière soumission de questionnaire
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  if (rows.length > 0) {
    const ids = rows.map((r) => r.id as string);
    const { data: subs } = await admin
      .from('questionnaire_responses')
      .select('patient_id, submitted_at')
      .in('patient_id', ids)
      .order('submitted_at', { ascending: false });

    const lastByPatient = new Map<string, string>();
    for (const s of (subs ?? []) as Array<{ patient_id: string; submitted_at: string }>) {
      if (!lastByPatient.has(s.patient_id)) lastByPatient.set(s.patient_id, s.submitted_at);
    }
    for (const r of rows) r.last_submitted_at = lastByPatient.get(r.id as string) ?? null;
  }

  const mapped = rows
    .map(mapPatientRow)
    .sort((a, b) => (RISK_PRIORITY[a.riskLevel as string] ?? 3) - (RISK_PRIORITY[b.riskLevel as string] ?? 3));

  return json(mapped);
}

async function createPatient(req: Request): Promise<Response> {
  const user = await requireDoctor(req);
  const dto = await req.json() as {
    fullName: string;
    phone: string;
    pregnancyStart: string;
    expectedTerm: string;
    notes?: string;
  };

  const admin = makeAdminClient();
  const { data, error } = await admin
    .from('patients')
    .insert({
      doctor_id: user.id,
      full_name: dto.fullName,
      phone: dto.phone,
      pregnancy_start: dto.pregnancyStart,
      expected_term: dto.expectedTerm,
      notes: dto.notes ?? null,
      status: 'pregnant',
      risk_level: 'green',
    })
    .select()
    .single();

  if (error) return err(error.message, 500);

  // SMS d'onboarding (non bloquant)
  const message = `Bonjour ${dto.fullName} ! Votre médecin vous a inscrite sur MamaCare AI. ` +
    `Remplissez votre questionnaire quotidien ici : ${PWA_URL}\nRépondez STOP pour vous désabonner.`;
  sendSms(dto.phone, message).catch((e) => console.error('[createPatient] SMS onboarding', e));

  return json(mapPatientRow(data as Record<string, unknown>));
}

async function getPatient(req: Request, id: string): Promise<Response> {
  const user = await requireAuth(req);
  const admin = makeAdminClient();
  const { data, error } = await admin.from('patients').select('*').eq('id', id).single();
  if (error || !data) return err('Patiente introuvable', 404);

  const row = data as Record<string, unknown>;
  // Accès : doctor de la patiente OU la patiente elle-même
  if (user.role === 'doctor' && row.doctor_id !== user.id) return err('Accès refusé', 403);
  if (user.role === 'patient' && row.user_id !== user.id) return err('Accès refusé', 403);

  return json(mapPatientRow(row));
}

async function updatePatient(req: Request, id: string): Promise<Response> {
  const user = await requireDoctor(req);
  const dto = await req.json() as Record<string, unknown>;
  const admin = makeAdminClient();

  // Vérifier la propriété
  const { data: existing } = await admin.from('patients').select('doctor_id').eq('id', id).single();
  if (!existing || (existing as { doctor_id: string }).doctor_id !== user.id) {
    return err('Accès refusé', 403);
  }

  const updates: Record<string, unknown> = {};
  if (dto.fullName !== undefined) updates.full_name = dto.fullName;
  if (dto.phone !== undefined) updates.phone = dto.phone;
  if (dto.pregnancyStart !== undefined) updates.pregnancy_start = dto.pregnancyStart;
  if (dto.expectedTerm !== undefined) updates.expected_term = dto.expectedTerm;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.status !== undefined) updates.status = dto.status;

  const { data, error } = await admin.from('patients').update(updates).eq('id', id).select().single();
  if (error) return err(error.message, 500);
  return json(mapPatientRow(data as Record<string, unknown>));
}

async function archivePatient(req: Request, id: string): Promise<Response> {
  const user = await requireDoctor(req);
  const { reason } = await req.json().catch(() => ({ reason: null }));

  const admin = makeAdminClient();
  const { data: existing } = await admin.from('patients').select('doctor_id').eq('id', id).single();
  if (!existing || (existing as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);

  const { error } = await admin
    .from('patients')
    .update({
      is_active: false,
      archived_at: new Date().toISOString(),
      archive_reason: reason ?? null,
    })
    .eq('id', id);
  if (error) return err(error.message, 500);
  return json({ success: true });
}

async function getPatientSummary(req: Request, id: string): Promise<Response> {
  const user = await requireDoctor(req);
  const admin = makeAdminClient();

  const { data: patient } = await admin.from('patients').select('doctor_id').eq('id', id).single();
  if (!patient || (patient as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);

  // Historique 30 jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: responses } = await admin
    .from('questionnaire_responses')
    .select('alert_level, triggered_rules, ai_analysis, submitted_at')
    .eq('patient_id', id)
    .gte('submitted_at', thirtyDaysAgo.toISOString())
    .order('submitted_at', { ascending: false })
    .limit(30);

  const history: SummaryHistoryEntry[] = ((responses ?? []) as Array<{
    alert_level: string;
    triggered_rules: string[];
    ai_analysis: string | null;
    submitted_at: string;
  }>).map((r) => ({
    date: r.submitted_at.split('T')[0],
    level: r.alert_level,
    rules: r.triggered_rules ?? [],
    analysis: r.ai_analysis,
  }));

  if (history.length === 0) {
    return json({
      summary: 'Pas encore de données — la patiente n\'a soumis aucun questionnaire.',
      generatedAt: new Date().toISOString(),
      cached: false,
    });
  }

  const summary = await generatePatientSummary(history);
  return json({ summary, generatedAt: new Date().toISOString(), cached: false });
}

// ═══════════════════════════════════════════════════════════════════════════
// QUESTIONNAIRE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function submitQuestionnaire(req: Request): Promise<Response> {
  const user = await requirePatient(req);
  const dto = await req.json() as {
    type: 'pregnancy' | 'postnatal';
    responses: Record<string, string>;
    pregnancyWeek?: number;
    babyDayOfLife?: number;
  };

  const admin = makeAdminClient();

  // Récupérer le patientId depuis user.id (user_id dans patients)
  const { data: patient } = await admin
    .from('patients')
    .select('id, doctor_id')
    .eq('user_id', user.id)
    .single();

  if (!patient) return err('Patiente introuvable pour cet utilisateur', 404);
  const patientId = (patient as { id: string; doctor_id: string }).id;

  // a. Vérifier soumission du jour
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data: existing } = await admin
    .from('questionnaire_responses')
    .select('id')
    .eq('patient_id', patientId)
    .gte('submitted_at', todayStart.toISOString())
    .limit(1)
    .maybeSingle();
  if (existing) return err("Questionnaire déjà soumis aujourd'hui. Revenez demain.", 400);

  // b. Règles OMS
  const consecutiveDaysWithoutWater = await getConsecutiveDaysWithoutWater(patientId, dto.responses, admin);
  const context: EvaluationContext = {
    pregnancyWeek: dto.pregnancyWeek,
    type: dto.type,
    babyDayOfLife: dto.babyDayOfLife,
    consecutiveDaysWithoutWater,
    isWeeklyDay: new Date().getDay() === 5,
  };
  const { alertLevel, triggeredRules } = evaluateWhoRules(dto.responses, context);

  // c. Alerte AVANT Claude
  let alertId: string | null = null;
  if (alertLevel === 'red' || alertLevel === 'orange') {
    const notifMessage = buildNotificationMessage(alertLevel, triggeredRules);
    alertId = await triggerAlert(patientId, null, alertLevel, notifMessage, admin);
  }

  // d. Claude explanation
  const explanation = await generateExplanation(dto.responses, alertLevel, triggeredRules);

  // e. INSERT questionnaire
  const { data: inserted, error: insErr } = await admin
    .from('questionnaire_responses')
    .insert({
      patient_id: patientId,
      type: dto.type,
      responses: dto.responses,
      alert_level: alertLevel,
      triggered_rules: triggeredRules,
      ai_analysis: explanation,
    })
    .select('id')
    .single();
  if (insErr || !inserted) return err("Erreur lors de l'enregistrement du questionnaire", 500);

  const responseId = (inserted as { id: string }).id;

  // f. + g. en parallèle : lier l'alerte + update risk level
  await Promise.all([
    alertId
      ? admin.from('alerts').update({ response_id: responseId }).eq('id', alertId)
      : Promise.resolve(),
    admin.from('patients').update({ risk_level: alertLevel }).eq('id', patientId),
  ]);

  return json({ alertLevel, triggeredRules, explanation });
}

async function getTodayStatus(req: Request): Promise<Response> {
  const user = await requirePatient(req);
  const admin = makeAdminClient();

  const { data: patient } = await admin.from('patients').select('id').eq('user_id', user.id).single();
  if (!patient) return json({ submitted: false });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const { data } = await admin
    .from('questionnaire_responses')
    .select('alert_level, submitted_at')
    .eq('patient_id', (patient as { id: string }).id)
    .gte('submitted_at', todayStart.toISOString())
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return json({ submitted: false });
  return json({ submitted: true, alertLevel: (data as { alert_level: string }).alert_level });
}

async function getMyHistory(req: Request): Promise<Response> {
  const user = await requirePatient(req);
  const admin = makeAdminClient();

  const { data: patient } = await admin.from('patients').select('id').eq('user_id', user.id).single();
  if (!patient) return json([]);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await admin
    .from('questionnaire_responses')
    .select('id, type, responses, alert_level, triggered_rules, ai_analysis, submitted_at')
    .eq('patient_id', (patient as { id: string }).id)
    .gte('submitted_at', thirtyDaysAgo.toISOString())
    .order('submitted_at', { ascending: false });

  if (error) return err(error.message, 500);
  return json(data ?? []);
}

async function getHistory(req: Request, patientId: string): Promise<Response> {
  const user = await requireDoctor(req);
  const admin = makeAdminClient();

  const { data: patient } = await admin.from('patients').select('id, doctor_id').eq('id', patientId).single();
  if (!patient || (patient as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await admin
    .from('questionnaire_responses')
    .select('id, type, responses, alert_level, triggered_rules, ai_analysis, submitted_at')
    .eq('patient_id', patientId)
    .gte('submitted_at', thirtyDaysAgo.toISOString())
    .order('submitted_at', { ascending: false });

  if (error) return err(error.message, 500);
  return json(data ?? []);
}

async function getConsecutiveDaysWithoutWater(
  patientId: string,
  currentResponses: Record<string, string>,
  admin: ReturnType<typeof makeAdminClient>,
): Promise<number> {
  if (currentResponses['Q10'] !== 'non') return 0;
  const { data } = await admin
    .from('questionnaire_responses')
    .select('responses, submitted_at')
    .eq('patient_id', patientId)
    .order('submitted_at', { ascending: false })
    .limit(5);
  let count = 1;
  for (const row of (data ?? []) as Array<{ responses: Record<string, string> }>) {
    if (row.responses['Q10'] === 'non') count++;
    else break;
  }
  return count;
}

function buildNotificationMessage(level: AlertLevel, rules: string[]): string {
  const urgency = level === 'red' ? 'URGENCE MamaCare' : 'Alerte MamaCare';
  return `${urgency} : ${rules.slice(0, 2).join(', ')}. Ouvrez votre dashboard pour le détail.`;
}

// ═══════════════════════════════════════════════════════════════════════════
// ALERTS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Déclenche une alerte : INSERT + WhatsApp + SMS fallback immédiat si échec.
 * Retourne l'alertId.
 *
 * Note : le délai 5min du backend NestJS est remplacé par un fallback immédiat
 * (setTimeout impossible en serverless). En pratique, cela garantit que
 * le médecin reçoit TOUJOURS au moins un canal même si WhatsApp échoue.
 */
async function triggerAlert(
  patientId: string,
  responseId: string | null,
  alertType: AlertLevel,
  message: string,
  admin: ReturnType<typeof makeAdminClient>,
): Promise<string> {
  const { data: alert, error } = await admin
    .from('alerts')
    .insert({ patient_id: patientId, response_id: responseId, alert_type: alertType, message })
    .select('id')
    .single();
  if (error || !alert) throw new Error('Erreur création alerte: ' + error?.message);
  const alertId = (alert as { id: string }).id;

  // Récupérer le téléphone du médecin
  const { data: patient } = await admin.from('patients').select('doctor_id').eq('id', patientId).single();
  if (!patient) return alertId;
  const { data: profile } = await admin
    .from('profiles')
    .select('phone')
    .eq('id', (patient as { doctor_id: string }).doctor_id)
    .single();
  const doctorPhone = (profile as { phone: string } | null)?.phone;
  if (!doctorPhone) return alertId;

  // WhatsApp
  const wa = await sendWhatsAppAlert(doctorPhone, message);
  await admin.from('notification_logs').insert({
    alert_id: alertId,
    patient_id: patientId,
    channel: 'whatsapp',
    recipient: doctorPhone,
    message,
    status: wa.success ? 'sent' : 'failed',
  });

  if (wa.success) {
    await admin
      .from('alerts')
      .update({ whatsapp_sent: true, whatsapp_at: new Date().toISOString() })
      .eq('id', alertId);
    return alertId;
  }

  // SMS fallback immédiat (serverless = pas de setTimeout)
  const smsRes = await sendSms(doctorPhone, message);
  await admin.from('notification_logs').insert({
    alert_id: alertId,
    patient_id: patientId,
    channel: 'sms',
    recipient: doctorPhone,
    message,
    status: smsRes.success ? 'sent' : 'failed',
  });
  if (smsRes.success) {
    await admin
      .from('alerts')
      .update({ sms_sent: true, sms_at: new Date().toISOString() })
      .eq('id', alertId);
  }

  return alertId;
}

async function listAlerts(req: Request): Promise<Response> {
  const user = await requireDoctor(req);
  const admin = makeAdminClient();

  const { data: patients } = await admin
    .from('patients')
    .select('id, full_name, phone')
    .eq('doctor_id', user.id);

  const rows = (patients ?? []) as Array<{ id: string; full_name: string; phone: string }>;
  if (rows.length === 0) return json([]);

  const patientIds = rows.map((p) => p.id);
  const patientMap = new Map(rows.map((p) => [p.id, p]));

  const { data: alerts, error } = await admin
    .from('alerts')
    .select('*')
    .in('patient_id', patientIds)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });

  if (error) return err(error.message, 500);

  const enriched = ((alerts ?? []) as Array<Record<string, unknown>>).map((a) => ({
    ...a,
    patient: patientMap.get(a.patient_id as string) ?? null,
  }));
  return json(enriched);
}

async function resolveAlert(req: Request, alertId: string): Promise<Response> {
  const user = await requireDoctor(req);
  const admin = makeAdminClient();

  const { data: alert } = await admin.from('alerts').select('patient_id').eq('id', alertId).single();
  if (!alert) return err('Alerte introuvable', 404);

  const { data: patient } = await admin
    .from('patients')
    .select('id')
    .eq('id', (alert as { patient_id: string }).patient_id)
    .eq('doctor_id', user.id)
    .single();
  if (!patient) return err('Accès refusé à cette alerte', 403);

  const { error } = await admin
    .from('alerts')
    .update({ resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', alertId);
  if (error) return err(error.message, 500);
  return json({ success: true });
}

// ═══════════════════════════════════════════════════════════════════════════
// APPOINTMENTS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function mapAppointment(row: Record<string, unknown>) {
  return {
    id: row.id,
    patientId: row.patient_id,
    doctorId: row.doctor_id,
    type: row.type,
    title: row.title,
    description: row.description,
    scheduledAt: row.scheduled_at,
    location: row.location,
    status: row.status,
    notes: row.notes,
  };
}

async function listAppointments(req: Request, url: URL): Promise<Response> {
  const user = await requireAuth(req);
  const admin = makeAdminClient();
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  let query = admin.from('appointments').select('*').order('scheduled_at', { ascending: true });
  if (user.role === 'doctor') {
    query = query.eq('doctor_id', user.id);
  } else {
    // patient : retrouver ses appointments via patient_id
    const { data: p } = await admin.from('patients').select('id').eq('user_id', user.id).single();
    if (!p) return json([]);
    query = query.eq('patient_id', (p as { id: string }).id);
  }
  if (from) query = query.gte('scheduled_at', from);
  if (to) query = query.lte('scheduled_at', to);

  const { data, error } = await query;
  if (error) return err(error.message, 500);
  return json(((data ?? []) as Array<Record<string, unknown>>).map(mapAppointment));
}

async function createAppointment(req: Request): Promise<Response> {
  const user = await requireDoctor(req);
  const dto = await req.json() as {
    patientId: string;
    type: string;
    title: string;
    scheduledAt: string;
    location?: string;
    description?: string;
  };

  const admin = makeAdminClient();
  // Vérifier que la patiente appartient au médecin
  const { data: patient } = await admin.from('patients').select('doctor_id').eq('id', dto.patientId).single();
  if (!patient || (patient as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);

  const { data, error } = await admin
    .from('appointments')
    .insert({
      patient_id: dto.patientId,
      doctor_id: user.id,
      type: dto.type,
      title: dto.title,
      scheduled_at: dto.scheduledAt,
      location: dto.location ?? null,
      description: dto.description ?? null,
      status: 'scheduled',
    })
    .select()
    .single();
  if (error) return err(error.message, 500);
  return json(mapAppointment(data as Record<string, unknown>));
}

async function updateAppointment(req: Request, id: string): Promise<Response> {
  const user = await requireDoctor(req);
  const dto = await req.json() as Record<string, unknown>;
  const admin = makeAdminClient();

  const { data: existing } = await admin.from('appointments').select('doctor_id').eq('id', id).single();
  if (!existing || (existing as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);

  const updates: Record<string, unknown> = {};
  if (dto.status !== undefined) updates.status = dto.status;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.title !== undefined) updates.title = dto.title;
  if (dto.scheduledAt !== undefined) updates.scheduled_at = dto.scheduledAt;
  if (dto.location !== undefined) updates.location = dto.location;
  if (dto.description !== undefined) updates.description = dto.description;

  const { data, error } = await admin.from('appointments').update(updates).eq('id', id).select().single();
  if (error) return err(error.message, 500);
  return json(mapAppointment(data as Record<string, unknown>));
}

async function deleteAppointment(req: Request, id: string): Promise<Response> {
  const user = await requireDoctor(req);
  const admin = makeAdminClient();
  const { data: existing } = await admin.from('appointments').select('doctor_id').eq('id', id).single();
  if (!existing || (existing as { doctor_id: string }).doctor_id !== user.id) return err('Accès refusé', 403);
  const { error } = await admin.from('appointments').delete().eq('id', id);
  if (error) return err(error.message, 500);
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

function getVapidPublicKey(): Response {
  const key = Deno.env.get('VAPID_PUBLIC_KEY');
  if (!key) {
    return json({
      publicKey: '',
      message: 'VAPID_PUBLIC_KEY non configurée — push désactivé',
    }, 200);
  }
  return json({ publicKey: key });
}

async function subscribePush(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const dto = await req.json() as { endpoint: string; p256dh: string; auth: string };
  const admin = makeAdminClient();
  const { error } = await admin
    .from('push_subscriptions')
    .upsert({ user_id: user.id, endpoint: dto.endpoint, p256dh: dto.p256dh, auth_key: dto.auth }, { onConflict: 'user_id,endpoint' });
  if (error) return err(error.message, 500);
  return json({ success: true });
}

async function unsubscribePush(req: Request): Promise<Response> {
  const user = await requireAuth(req);
  const { endpoint } = await req.json() as { endpoint: string };
  const admin = makeAdminClient();
  await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint);
  return json({ success: true });
}

/**
 * Cron endpoint — appelé par pg_cron ou un scheduler externe.
 * Protégé par x-internal-secret header.
 */
async function sendDailyReminders(req: Request): Promise<Response> {
  const secret = req.headers.get('x-internal-secret');
  const expected = Deno.env.get('INTERNAL_CRON_SECRET');
  if (!expected || secret !== expected) return err('Unauthorized', 401);

  const admin = makeAdminClient();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: patients } = await admin
    .from('patients')
    .select('id, user_id')
    .eq('is_active', true)
    .not('user_id', 'is', null);

  const rows = ((patients ?? []) as Array<{ id: string; user_id: string | null }>).filter(
    (p) => p.user_id !== null,
  );
  if (rows.length === 0) return json({ sent: 0, failed: 0 });

  // Patientes ayant déjà soumis aujourd'hui
  const { data: subs } = await admin
    .from('questionnaire_responses')
    .select('patient_id')
    .gte('submitted_at', todayStart.toISOString());
  const submittedIds = new Set<string>(((subs ?? []) as Array<{ patient_id: string }>).map((s) => s.patient_id));

  const pending = rows.filter((p) => !submittedIds.has(p.id));
  return json({ pending: pending.length, total: rows.length });
}
