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
        // Normalise la shape pour que les controllers lisent req.user.id
        // (même contrat qu'en prod, où req.user vient de la table profiles)
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
    const authHeader = headers['authorization'] ?? '';
    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
