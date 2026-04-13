import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface WhatsAppResult {
  success: boolean;
  messageId?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly accessToken: string;

  constructor(private readonly config: ConfigService) {
    const phoneNumberId = this.config.getOrThrow<string>('WHATSAPP_PHONE_NUMBER_ID');
    this.apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    this.accessToken = this.config.getOrThrow<string>('WHATSAPP_ACCESS_TOKEN');
  }

  async sendAlert(phone: string, message: string): Promise<WhatsAppResult> {
    this.logger.log(`WhatsApp → ${phone}`);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
        this.logger.error(
          `WhatsApp API erreur ${response.status} → ${phone}: ${errorBody}`,
        );
        return { success: false };
      }

      const data = (await response.json()) as {
        messages?: Array<{ id: string }>;
      };
      const messageId = data.messages?.[0]?.id;

      this.logger.log(`WhatsApp livré → ${phone} (messageId: ${messageId ?? 'n/a'})`);
      return { success: true, messageId };
    } catch (error) {
      this.logger.error(`WhatsApp exception → ${phone}`, error);
      return { success: false };
    }
  }
}
