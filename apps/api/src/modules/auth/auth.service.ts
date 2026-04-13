import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import {
  isDevMode,
  signDevToken,
  DEV_PROFILES,
  type DevRole,
  type DevTokenPayload,
} from '../../shared/dev-mode';

/**
 * ─── AuthService ─────────────────────────────────────────────────────────────
 *
 * Responsable de l'authentification :
 * - Mode PROD : Supabase OTP via SMS
 * - Mode DEV  : Login direct par rôle (pas de SMS, token HMAC signé)
 */

export interface AuthProfile {
  id:         string;
  role:       'doctor' | 'patient';
  full_name:  string;
  phone:      string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  accessToken: string;
  profile:     AuthProfile;
}

@Injectable()
export class AuthService {
  constructor(private readonly supabase: SupabaseService) {}

  // ─── DEV : login direct par rôle ────────────────────────────────────────────

  /**
   * Login dev — retourne immédiatement un token signé et le profil associé.
   * Utilisé uniquement en mode démo/test.
   */
  devLogin(role: DevRole): AuthResponse {
    if (!isDevMode()) {
      throw new UnauthorizedException('Dev login désactivé en production');
    }

    const profile = DEV_PROFILES[role];
    const accessToken = signDevToken(role);
    const now = new Date().toISOString();

    return {
      accessToken,
      profile: {
        id:         profile.sub,
        role:       profile.role,
        full_name:  profile.full_name,
        phone:      profile.phone,
        created_at: now,
        updated_at: now,
      },
    };
  }

  // ─── PROD : OTP Supabase ────────────────────────────────────────────────────

  async sendOtp(phone: string): Promise<{ sent: boolean }> {
    if (isDevMode()) {
      return { sent: true };
    }

    const { error } = await this.supabase.getClient().auth.signInWithOtp({
      phone,
      options: { channel: 'sms' },
    });

    if (error) {
      throw new UnauthorizedException(error.message ?? "Impossible d'envoyer le code OTP");
    }

    return { sent: true };
  }

  async verifyOtp(phone: string, token: string): Promise<AuthResponse> {
    if (isDevMode()) {
      // En dev, on redirige vers devLogin (par défaut : patient)
      return this.devLogin('patient');
    }

    const { data, error } = await this.supabase.getClient().auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.user || !data.session) {
      throw new UnauthorizedException(error?.message ?? 'Code OTP invalide');
    }

    const { data: profile } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, role, full_name, phone, created_at, updated_at')
      .eq('id', data.user.id)
      .single();

    if (!profile) {
      throw new UnauthorizedException('Profil utilisateur introuvable');
    }

    return {
      accessToken: data.session.access_token,
      profile:     profile as AuthProfile,
    };
  }

  // ─── /auth/me : récupérer le profil depuis le payload du JwtGuard ──────────

  /**
   * Récupère le profil complet à partir du payload déjà validé par JwtGuard.
   * Le guard a déjà validé le token et posé `request.user` avec le payload dev
   * ou le profil Supabase.
   */
  profileFromRequest(user: DevTokenPayload | AuthProfile): AuthProfile {
    // Si c'est un payload dev (a un champ `sub`), on le convertit
    if ('sub' in user) {
      const devUser = user as DevTokenPayload;
      const now = new Date().toISOString();
      return {
        id:         devUser.sub,
        role:       devUser.role,
        full_name:  devUser.full_name,
        phone:      devUser.phone,
        created_at: now,
        updated_at: now,
      };
    }
    // Sinon c'est déjà un profil Supabase
    return user;
  }
}
