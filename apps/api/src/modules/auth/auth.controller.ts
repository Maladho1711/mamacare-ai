import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, type AuthProfile } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtGuard } from './jwt.guard';
import type { DevTokenPayload } from '../../shared/dev-mode';

const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 jours en ms
const IS_PROD = process.env['NODE_ENV'] === 'production';

function setAuthCookie(res: Response, token: string): void {
  res.cookie('mc_token', token, {
    httpOnly: true,            // Inaccessible au JavaScript — protège contre XSS
    secure: IS_PROD,           // HTTPS uniquement en production
    sameSite: IS_PROD ? 'strict' : 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/dev-login
   * Login direct en mode dev : retourne le token + profil.
   * Ne fonctionne que si DEV_MODE=true dans .env.
   */
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  async devLogin(
    @Body() dto: DevLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.authService.devLogin(dto.role);
    setAuthCookie(res, result.accessToken);
    return result;
  }

  /**
   * POST /auth/send-otp — production : envoie un SMS OTP via Supabase.
   */
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone);
  }

  /**
   * POST /auth/verify-otp — vérifie le code OTP et pose le cookie HttpOnly.
   * Retourne uniquement le profil (le token reste dans le cookie HttpOnly).
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto.phone, dto.token);
    setAuthCookie(res, result.accessToken);
    // Ne pas retourner le token dans le body — il est dans le cookie HttpOnly
    return { profile: result.profile };
  }

  /**
   * POST /auth/logout — supprime le cookie d'authentification.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('mc_token', { path: '/' });
    return { ok: true };
  }

  /**
   * GET /auth/me — retourne le profil courant à partir du token Bearer ou cookie.
   */
  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: { user: DevTokenPayload | AuthProfile }) {
    return { profile: this.authService.profileFromRequest(req.user) };
  }
}
