import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { CreateMarketingDto } from './dto/create-marketing.dto';

@Controller('marketing')
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

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
// 👇 AGREGAR ESTO PARA EDITAR INFO BÁSICA
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: any) {
    return this.marketingService.update(+id, updateDto);
  }
  // Ruta para actualizar un evento específico
  // Ejemplo: PATCH /marketing/5/combos
  // Body: { "fecha_realizacion": "2025-12-01" }
  @Patch(':id/:eventoKey')
  updateEvento(
    @Param('id') id: string,
    @Param('eventoKey') eventoKey: string,
    @Body() datos: any,
  ) {
    return this.marketingService.updateEvento(+id, eventoKey, datos);
  }
}