// src/auth/auth.controller.ts
import { Controller, Request, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard) // 1. Activa el "portero" de autenticación
  @Post('login') // 2. La ruta es POST /auth/login
  async login(@Request() req) {
    // 3. Si las credenciales son correctas, el guardián nos da el usuario
    //    y lo pasamos al servicio de login para generar el token.
    return this.authService.login(req.user);
  }
}