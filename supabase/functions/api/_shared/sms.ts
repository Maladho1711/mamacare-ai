/**
 * Africa's Talking SMS — port Deno de apps/api/src/modules/alerts/sms.service.ts
 */

export interface SmsResult {
  success: boolean;
}

type AfricasTalkingResponse = {
  SMSMessageData?: {
    Recipients?: Array<{ status: string; number: string }>;
  };
};

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  const username = Deno.env.get('AFRICA_TALKING_USERNAME');
  const apiKey = Deno.env.get('AFRICA_TALKING_API_KEY');

  if (!username || !apiKey) {
    console.error('[sms] AFRICA_TALKING_USERNAME ou API_KEY manquant');
    return { success: false };
  }

  const apiUrl = 'https://api.africastalking.com/version1/messaging';
  const body = new URLSearchParams({ username, to: phone, message });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        apiKey,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      console.error(`[sms] erreur ${response.status} → ${phone}: ${await response.text()}`);
      return { success: false };
    }

    const data = (await response.json()) as AfricasTalkingResponse;
    const recipient = data.SMSMessageData?.Recipients?.[0];
    const success = recipient?.status === 'Success';
    console.log(`[sms] ${success ? 'livré' : 'échec'} → ${phone}`);
    return { success };
  } catch (error) {
    console.error(`[sms] exception → ${phone}`, error);
    return { success: false };
  }
}
