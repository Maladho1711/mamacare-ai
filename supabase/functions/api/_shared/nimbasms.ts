/**
 * Nimba SMS — fournisseur SMS local Guinée.
 *
 * Auth : Basic (SERVICE_ID + SECRET_TOKEN) en base64
 * API : POST https://api.nimbasms.com/v1/messages
 * Body : { to: ['6XXXXXXXXX'], message: '...', sender_name: 'MamaCare' }
 *
 * Avantages vs Africa's Talking :
 * - Tarif local : ~0.01€/SMS (vs ~0.04€)
 * - Délivrabilité Guinée : excellente (opérateur local Orange/MTN/Cellcom)
 * - Pas besoin de carte bancaire internationale
 *
 * Format téléphone : Nimba attend le numéro LOCAL sans préfixe (ex: 623436513)
 * Notre format interne est +224623436513 → on strip le préfixe.
 */

export interface NimbaSmsResult {
  success: boolean;
  messageId?: string;
}

const NIMBA_API_URL = 'https://api.nimbasms.com/v1/messages';

/**
 * Envoie un SMS via Nimba SMS (Guinée).
 * Retourne { success: false } si non configuré ou échec — l'appelant peut alors
 * tenter un fallback (Africa's Talking).
 */
export async function sendNimbaSms(phone: string, message: string): Promise<NimbaSmsResult> {
  const serviceId   = Deno.env.get('NIMBA_SERVICE_ID');
  const secretToken = Deno.env.get('NIMBA_SECRET_TOKEN');
  const senderName  = Deno.env.get('NIMBA_SENDER_NAME') ?? 'MamaCare';

  if (!serviceId || !secretToken) {
    console.warn('[nimba] NIMBA_SERVICE_ID ou NIMBA_SECRET_TOKEN absent');
    return { success: false };
  }

  // Strip "+224" prefix — Nimba attend le format local
  const cleanPhone = phone.replace(/^\+?224/, '').replace(/\D/g, '');

  const auth = btoa(`${serviceId}:${secretToken}`);

  try {
    const response = await fetch(NIMBA_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: [cleanPhone],
        message,
        sender_name: senderName,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[nimba] erreur ${response.status} → ${cleanPhone}: ${body}`);
      return { success: false };
    }

    const data = await response.json().catch(() => null) as { messageid?: string } | null;
    console.log(`[nimba] livré → ${cleanPhone}`);
    return { success: true, messageId: data?.messageid };
  } catch (error) {
    console.error(`[nimba] exception → ${cleanPhone}`, error);
    return { success: false };
  }
}

/**
 * Tente Nimba en premier, fallback automatique sur Africa's Talking si échec.
 * Garantit qu'au moins UNE tentative est faite via le fournisseur disponible.
 */
export async function sendSmsWithFallback(
  phone: string,
  message: string,
  africasTalkingFallback: (p: string, m: string) => Promise<{ success: boolean }>,
): Promise<{ success: boolean; provider: 'nimba' | 'africastalking' | null }> {
  const nimba = await sendNimbaSms(phone, message);
  if (nimba.success) return { success: true, provider: 'nimba' };

  console.log('[sms-fallback] Nimba KO, tentative Africa\'s Talking');
  const at = await africasTalkingFallback(phone, message);
  if (at.success) return { success: true, provider: 'africastalking' };

  return { success: false, provider: null };
}
