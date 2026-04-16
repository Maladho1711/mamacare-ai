import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { isDevMode, verifyDevToken } from '../../shared/dev-mode';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string>;
      user: unknown;
    }>();

    const token = this.extractToken(request.headers);

    if (!token) {
      throw new UnauthorizedException('Token Bearer manquant');
    }

    // ── Mode DEV : valider le token HMAC ─────────────────────────────────────
    if (isDevMode() && token.startsWith('dev_')) {
      try {
        const payload = verifyDevToken(token);
        request.user = {
          id:        payload.sub,
          role:      payload.role,
          full_name: payload.full_name,
          phone:     payload.phone,
        };
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Token dev invalide';
        throw new UnauthorizedException(`Token dev : ${message}`);
      }
    }

    // ── Mode PROD : vérification Supabase ────────────────────────────────────
    const { data: { user }, error } = await this.supabase.getClient().auth.getUser(token);

    if (error || !user) {
      throw new UnauthorizedException('Token invalide ou expiré');
    }

    const { data: profile, error: profileError } = await this.supabase
      .getClient()
      .from('profiles')
      .select('id, role, full_name, phone, created_at, updated_at')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new UnauthorizedException('Profil utilisateur introuvable');
    }

    request.user = profile;
    return true;
  }

  private extractToken(headers: Record<string, string>): string | undefined {
    // 1. Cookie HttpOnly mc_token (prioritaire — plus sécurisé contre XSS)
    const cookieToken = this.extractFromCookieHeader(headers['cookie']);
    if (cookieToken) return cookieToken;

    // 2. Header Authorization Bearer (fallback: démo DEMO_TOKEN, rétrocompat)
    const authHeader = headers['authorization'] ?? '';
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  /** Parse le header Cookie pour extraire mc_token sans cookie-parser */
  private extractFromCookieHeader(cookieHeader: string | undefined): string | undefined {
    if (!cookieHeader) return undefined;
    const match = cookieHeader
      .split('; ')
      .find((row) => row.startsWith('mc_token='));
    if (!match) return undefined;
    const value = match.substring('mc_token='.length);
    return value || undefined;
  }
}
