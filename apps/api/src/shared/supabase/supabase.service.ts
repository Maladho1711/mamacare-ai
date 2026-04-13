import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec service role key — bypass RLS.
 * UNIQUEMENT côté backend NestJS. Ne jamais exposer côté frontend.
 */
@Injectable()
export class SupabaseService implements OnModuleInit {
  private client!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = createClient(
      this.config.getOrThrow<string>('NEXT_PUBLIC_SUPABASE_URL'),
      this.config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
