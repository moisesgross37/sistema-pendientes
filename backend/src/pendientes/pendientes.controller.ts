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
// @UseGuards(JwtAuthGuard) // <-- BORRAMOS EL GUARDIA DE LA PUERTA PRINCIPAL
export class PendientesController {
  constructor(private readonly pendientesService: PendientesService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard) // Ponemos un guardia aquí
  @UseInterceptors(
    FilesInterceptor('files', 5, {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          return cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    const response = files.map(file => ({
      originalName: file.originalname,
      fileName: file.filename,
    }));
    return response;
  }

  // --- RUTA PÚBLICA PARA VER IMÁGENES ---
  @Get('uploads/:filename')
  // <-- ESTA RUTA YA NO TIENE GUARDIA, ES PÚBLICA
  seeUploadedFile(@Param('filename') filename: string, @Res() res: Response) {
    return res.sendFile(filename, { root: './uploads' });
  }

  @Post()
  @UseGuards(JwtAuthGuard) // Ponemos un guardia aquí
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard) // Ponemos un guardia aquí
  findAll() {
    return this.pendientesService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard) // Ponemos un guardia aquí
  findOne(@Param('id') id: string) {
    return this.pendientesService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard) // Ponemos un guardia aquí
  update(
    @Param('id') id: string,
    @Body() updatePendienteDto: UpdatePendienteDto,
  ) {
    return this.pendientesService.update(+id, updatePendienteDto);
  }
}