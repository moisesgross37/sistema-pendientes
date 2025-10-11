import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  Delete, // <-- Importación nueva
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';

@Controller('pendientes')
export class PendientesController {
  constructor(private readonly pendientesService: PendientesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(/*...código sin cambios...*/)
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) { /*...código sin cambios...*/ }

  @Get('uploads/:filename')
  seeUploadedFile(@Param('filename') filename: string, @Res() res: Response) { /*...código sin cambios...*/ }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createPendienteDto: CreatePendienteDto) { /*...código sin cambios...*/ }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() { /*...código sin cambios...*/ }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) { /*...código sin cambios...*/ }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updatePendienteDto: UpdatePendienteDto) { /*...código sin cambios...*/ }

  // --- NUEVA RUTA PARA ELIMINAR ---
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @Request() req) {
    // Solo un administrador puede eliminar
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden eliminar pendientes.');
    }
    return this.pendientesService.remove(+id);
  }
}
