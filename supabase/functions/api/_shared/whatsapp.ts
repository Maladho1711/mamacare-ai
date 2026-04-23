/**
 * WhatsApp Business API — port Deno de apps/api/src/modules/alerts/whatsapp.service.ts
 */

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
}

export async function sendWhatsAppAlert(phone: string, message: string): Promise<WhatsAppResult> {
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');

  if (!phoneNumberId || !accessToken) {
    console.error('[whatsapp] WHATSAPP_PHONE_NUMBER_ID ou WHATSAPP_ACCESS_TOKEN manquant');
    return { success: false };
  }

  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: message },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[whatsapp] API erreur ${response.status} → ${phone}: ${errorBody}`);
      return { success: false };
    }

    const data = (await response.json()) as { messages?: Array<{ id: string }> };
    const messageId = data.messages?.[0]?.id;
    console.log(`[whatsapp] livré → ${phone} (messageId: ${messageId ?? 'n/a'})`);
    return { success: true, messageId };
  } catch (error) {
    console.error(`[whatsapp] exception → ${phone}`, error);
    return { success: false };
  }
}
