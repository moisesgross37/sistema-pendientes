import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateMarketingDto } from './dto/create-marketing.dto';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  // =========================================================
  // 👇 1. LAS RUTAS ESPECÍFICAS VAN PRIMERO (Para evitar conflictos)
  // =========================================================

  // OBTENER LISTA DE CENTROS (Para el buscador)
  @Get('lista-centros')
  getCentros() {
    return this.marketingService.findAllCentros();
  }

  // DISPARADOR DE SINCRONIZACIÓN
  // Le puse @Get temporalmente para que puedas probarlo en el navegador
  @Get('sincronizar') 
  sincronizar() {
    return this.marketingService.sincronizarCentros();
  }

  // =========================================================
  // 👇 2. LAS RUTAS GENÉRICAS VAN DESPUÉS
  // =========================================================

  @Post()
  create(@Body() createDto: CreateMarketingDto) {
    return this.marketingService.create(createDto);
  }

  @Get()
  findAll() {
    return this.marketingService.findAll();
  }

  // Ojo: Esta ruta ':id' es la "glotona". Si la pones arriba, se come a 'sincronizar'.
  // Por eso debe ir aquí abajo.
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