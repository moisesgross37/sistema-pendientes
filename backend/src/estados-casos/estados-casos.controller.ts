// backend/src/estados-casos/estados-casos.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  // (Añadiremos @UseGuards y @Roles en el futuro para proteger esto)
} from '@nestjs/common';
import { EstadosCasosService } from './estados-casos.service';
import { CreateEstadoCasoDto } from './dto/create-estado-caso.dto';
import { UpdateEstadoCasoDto } from './dto/update-estado-caso.dto';

// Todas las rutas aquí estarán bajo /estados-casos
@Controller('estados-casos')
export class EstadosCasosController {
  constructor(private readonly estadosCasosService: EstadosCasosService) {}

  // POST /estados-casos
  @Post()
  create(@Body() createEstadoCasoDto: CreateEstadoCasoDto) {
    return this.estadosCasosService.create(createEstadoCasoDto);
  }

  // GET /estados-casos
  @Get()
  findAll() {
    return this.estadosCasosService.findAll();
  }

  // GET /estados-casos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.estadosCasosService.findOne(id);
  }

  // PATCH /estados-casos/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoCasoDto: UpdateEstadoCasoDto,
  ) {
    return this.estadosCasosService.update(id, updateEstadoCasoDto);
  }

  // DELETE /estados-casos/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.estadosCasosService.remove(id);
  }
}