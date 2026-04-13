import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@mamacare/shared-types';
import { ROLES_KEY } from '../../shared/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: { role: UserRole } }>();

    if (!requiredRoles.includes(request.user?.role)) {
      throw new ForbiddenException(
        `Accès réservé aux rôles : ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
