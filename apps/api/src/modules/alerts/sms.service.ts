import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SmsResult {
  success: boolean;
}

type AfricasTalkingResponse = {
  SMSMessageData?: {
    Recipients?: Array<{ status: string; number: string }>;
  };
};

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiUrl = 'https://api.africastalking.com/version1/messaging';

  constructor(private readonly config: ConfigService) {}

  async sendSms(phone: string, message: string): Promise<SmsResult> {
    const username = this.config.getOrThrow<string>('AFRICA_TALKING_USERNAME');
    const apiKey = this.config.getOrThrow<string>('AFRICA_TALKING_API_KEY');

    this.logger.log(`SMS → ${phone}`);

    try {
      const body = new URLSearchParams({ username, to: phone, message });

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `Africa's Talking erreur ${response.status} → ${phone}: ${errorBody}`,
        );
        return { success: false };
      }

      const data = (await response.json()) as AfricasTalkingResponse;
      const recipient = data.SMSMessageData?.Recipients?.[0];
      const success = recipient?.status === 'Success';

      if (success) {
        this.logger.log(`SMS livré → ${phone}`);
      } else {
        this.logger.warn(
          `SMS non livré → ${phone}: ${JSON.stringify(data)}`,
        );
      }

      return { success };
    } catch (error) {
      this.logger.error(`SMS exception → ${phone}`, error);
      return { success: false };
    }
  }
}
