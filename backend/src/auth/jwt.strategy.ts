// src/auth/jwt.strategy.ts
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'ESTO_ES_UN_SECRETO', // ¡Debe ser el mismo secreto que en auth.module.ts!
    });
  }

  async validate(payload: any) {
    // El payload ya fue validado por passport-jwt, aquí solo lo devolvemos
    return { id: payload.sub, username: payload.username, rol: payload.rol };
  }
}