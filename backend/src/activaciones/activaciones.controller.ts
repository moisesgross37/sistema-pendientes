import { Controller, Post, Body, Request, UseGuards } from '@nestjs/common';
import { ActivacionesService } from './activaciones.service';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('activaciones')
export class ActivacionesController {
  constructor(private readonly activacionesService: ActivacionesService) {}

  @Post('manual')
  // @UseGuards(JwtAuthGuard)
  async activarManual(@Request() req, @Body() body: { nombreCentro: string, faseKey: string, userId: number }) {
    // Si usas autenticación, toma el ID del usuario del token (req.user.userId)
    // Por ahora usamos el que viene en el body o un default
    const idUsuario = body.userId || 1; 

    return this.activacionesService.activarFaseManual(body.nombreCentro, body.faseKey, idUsuario);
  }
}