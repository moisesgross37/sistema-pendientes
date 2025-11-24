import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosService } from '../usuarios/usuarios.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usuariosService: UsuariosService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    // 1. PRIMERA LIMPIEZA: .trim() elimina espacios al inicio y final
    // Esto arregla el 80% de los errores en móviles (ej: "Isolina ")
    const cleanUsername = username.trim();

    // Nota: Aquí enviamos el nombre limpio al servicio de usuarios.
    // Para que "isolina" (minúscula) encuentre a "Isolina" (Mayúscula),
    // debemos ajustar la búsqueda dentro de findOneByUsername (ver paso 2).
    const user = await this.usuariosService.findOneByUsername(cleanUsername);

    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, rol: user.rol };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}