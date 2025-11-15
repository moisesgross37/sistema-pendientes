// src/auth/guards/jwt-auth.guard.ts
    // Este es el archivo que nos faltaba.
    
    import { Injectable } from '@nestjs/common';
    import { AuthGuard } from '@nestjs/passport';
    
    @Injectable()
    export class JwtAuthGuard extends AuthGuard('jwt') {}