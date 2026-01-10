import { Controller, Get } from '@nestjs/common';
import { ServiciosService } from './servicios.service';

@Controller('servicios')
export class ServiciosController {
  constructor(private readonly serviciosService: ServiciosService) {}

  // 👇 EL BOTÓN DE PÁNICO (SEMILLA)
  @Get('semilla')
  ejecutarSemilla() {
    return this.serviciosService.semillaInicial();
  }

  // Listar servicios (por si acaso)
  @Get()
  findAll() {
    return this.serviciosService.findAll();
  }
}