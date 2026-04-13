import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService, type AuthProfile } from './auth.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { DevLoginDto } from './dto/dev-login.dto';
import { JwtGuard } from './jwt.guard';
import type { DevTokenPayload } from '../../shared/dev-mode';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/dev-login
   * Login direct en mode dev : retourne immédiatement un token pour le rôle demandé.
   * Ne fonctionne que si DEV_MODE=true dans .env.
   */
  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.role);
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
   * POST /auth/verify-otp — production : vérifie le code OTP.
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.phone, dto.token);
  }

  /**
   * GET /auth/me — retourne le profil courant à partir du token Bearer.
   * Utilisé par le frontend pour hydrater la session au refresh.
   */
  @Get('me')
  @UseGuards(JwtGuard)
  me(@Req() req: { user: DevTokenPayload | AuthProfile }) {
    return { profile: this.authService.profileFromRequest(req.user) };
  }
}
