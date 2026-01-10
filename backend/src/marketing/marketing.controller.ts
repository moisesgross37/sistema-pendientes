import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateMarketingDto } from './dto/create-marketing.dto';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // =========================================================
  // 👇 1. RUTAS DE GESTIÓN DE CENTROS (EL NUEVO NÚCLEO)
  // =========================================================

  // LISTA LIMPIA (Para selectores y vistas públicas)
  @Get('lista-centros')
  getCentros() {
    return this.marketingService.findAllCentros();
  }

  // LISTA COMPLETA (Para Admin - Gestión Maestra)
  @Get('admin/lista-centros')
  getCentrosAdmin() {
    return this.marketingService.findAllCentrosAdmin();
  }
// 👇 NUEVO ENDPOINT PARA LA PANTALLA EXCEL
  @Get('matriz-activaciones')
  getMatriz() {
    return this.marketingService.getActivationMatrix();
  }
  // INTERRUPTOR VISIBILIDAD (Activar/Desactivar Centro)
  @Patch('admin/centro/:id/toggle')
  toggleCentro(@Param('id') id: string) {
    return this.marketingService.toggleVisibilidadCentro(+id);
  }
// 👇 EL BOTÓN DE ACTIVACIÓN
  // POST /marketing/activar-fase
  // Body: { centroId: 1, eventoKey: '2', fase: 'ARTES' }
  @Post('activar-fase')
  activarFase(@Body() body: { centroId: number, eventoKey: string, fase: 'ARTES' | 'GENERAL' }) {
    return this.marketingService.activarEtapa(body.centroId, body.eventoKey, body.fase);
  }
  // 🆕 CREAR CENTRO MAESTRO (ACTUALIZADO 1.1)
  @Post('admin/centro')
  createCentroMaster(@Body() body: { 
      nombre: string; 
      tipo?: string; // <--- Nuevo
      asesor?: string; 
      padre?: string; 
      tio?: string; 
  }) {
    // Pasamos el tipo al servicio
    return this.marketingService.createCentroMaster(body.nombre, body.tipo, body.asesor, body.padre, body.tio);
  }

  // 🆕 EDITAR CENTRO MAESTRO (ACTUALIZADO 1.1)
  @Patch('admin/centro/:id')
  updateCentroMaster(
      @Param('id') id: string, 
      @Body() body: { 
          nombre: string; 
          tipo?: string; // <--- Nuevo
          asesor?: string; 
          padre?: string; 
          tio?: string; 
      }
  ) {
    return this.marketingService.updateCentroMaster(+id, body.nombre, body.tipo, body.asesor, body.padre, body.tio);
  }

  // ELIMINAR CENTRO
  @Delete('admin/centro/:id')
  deleteCentroMaster(@Param('id') id: string) {
    return this.marketingService.deleteCentroMaster(+id);
  }

  // SINCRONIZADOR (LEGACY - Evaluar eliminar a futuro si ya no se usa Excel)
  @Get('sincronizar') 
  sincronizar() {
    return this.marketingService.sincronizarCentros();
  }

  // =========================================================
  // 👇 2. RUTAS GENÉRICAS / LEGACY (MARKETING ANTIGUO)
  // =========================================================
  /* NOTA PARA EL FUTURO:
     Estas rutas abajo parecen ser del sistema viejo donde "Marketing" era todo.
     A medida que migremos a "La Torre", deberíamos ir limpiando esto.
  */

  @Post()
  create(@Body() createDto: CreateMarketingDto) {
    return this.marketingService.create(createDto);
  }

  @Get()
  findAll() {
    return this.marketingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.marketingService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.marketingService.update(+id, updateDto);
  }

  @Patch(':id/:eventoKey')
  updateEvento(
    @Param('id') id: string,
    @Param('eventoKey') eventoKey: string,
    @Body() datos: any,
  ) {
    return this.marketingService.updateEvento(+id, eventoKey, datos);
  }
}