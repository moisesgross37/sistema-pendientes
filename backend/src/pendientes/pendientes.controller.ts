import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, // <-- Esta importación de 'UseGuards' se queda
  UseInterceptors,
  UploadedFiles,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // <--- 1. LÍNEA COMENTADA
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Response } from 'express'; // <--- 2. 'type' AÑADIDO

// @UseGuards(JwtAuthGuard) // <--- 1. LÍNEA COMENTADA
@Controller('pendientes')
export class PendientesController {
  constructor(private readonly pendientesService: PendientesService) {}

  // POST /pendientes/upload
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'),
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    return files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
    }));
  }

  // GET /pendientes/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    res.sendFile(filename, { root: join(process.cwd(), 'uploads') });
  }

  // POST /pendientes
  @Post()
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  // GET /pendientes
  @Get()
  findAll() {
    return this.pendientesService.findAll();
  }

  // GET /pendientes/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pendientesService.findOne(id);
  }

  // PATCH /pendientes/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePendienteDto: UpdatePendienteDto,
  ) {
    return this.pendientesService.update(id, updatePendienteDto);
  }

  // DELETE /pendientes/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.pendientesService.remove(id);
  }
}