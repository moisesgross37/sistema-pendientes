import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateMarketingDto } from './dto/create-marketing.dto';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // =========================================================
  // 👇 1. RUTAS ESPECÍFICAS (VAN PRIMERO)
  // =========================================================

  // LISTA LIMPIA (Para usuarios - Solo visibles)
  @Get('lista-centros')
  getCentros() {
    return this.marketingService.findAllCentros();
  }

  // LISTA COMPLETA (Para Admin - Todos)
  @Get('admin/lista-centros')
  getCentrosAdmin() {
    return this.marketingService.findAllCentrosAdmin();
  }

  // INTERRUPTOR VISIBILIDAD
  @Patch('admin/centro/:id/toggle')
  toggleCentro(@Param('id') id: string) {
    return this.marketingService.toggleVisibilidadCentro(+id);
  }

  // SINCRONIZADOR (Cosecha)
  @Get('sincronizar') 
  sincronizar() {
    return this.marketingService.sincronizarCentros();
  }

  // =========================================================
  // 👇 2. RUTAS GENÉRICAS (VAN DESPUÉS)
  // =========================================================

  @Post()
  create(@Body() createDto: CreateMarketingDto) {
    return this.marketingService.create(createDto);
  }

  @Get()
  findAll() {
    return this.marketingService.findAll();
  }

  // BUSCAR POR ID (Esta ruta es "glotona", debe ir casi al final)
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