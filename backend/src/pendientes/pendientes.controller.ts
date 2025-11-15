import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards, // <-- Se queda
  UseInterceptors,
  UploadedFiles,
  Res,
  Req, // <-- 1. AÑADIDO
  ParseIntPipe,
} from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // <-- 2. DESCOMENTADO
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Request, Response } from 'express'; // <-- 1. AÑADIDO 'Request'

// Ya no usamos el guardián global aquí, lo aplicamos a cada ruta
@Controller('pendientes')
export class PendientesController {
  constructor(private readonly pendientesService: PendientesService) {}

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
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
  // (Esta ruta se queda pública para que se puedan ver las imágenes)
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    res.sendFile(filename, { root: join(process.cwd(), 'uploads') });
  }

  // POST /pendientes
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
  @Post()
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  // GET /pendientes (SOLO PARA ADMINS)
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
  @Get()
  findAll() {
    // Esta función 'findAll' ahora solo será usada por el Admin
    return this.pendientesService.findAll();
  }

  // --- 4. INICIO DE LAS NUEVAS RUTAS ---

  // GET /pendientes/mis-proyectos (PARA ASESORES)
  @UseGuards(JwtAuthGuard)
  @Get('mis-proyectos')
  findMisProyectos(@Req() req: Request) {
    // Obtenemos el ID del usuario desde el token
    // --- 👇 CORRECCIÓN (Era .sub, ahora es .id) ---
    const userId = (req.user as any).id;

    // Llamamos a una NUEVA función en el service
    return this.pendientesService.findForAsesor(userId);
  }

  // GET /pendientes/mis-asignaciones (PARA COLABORADORES)
  @UseGuards(JwtAuthGuard)
  @Get('mis-asignaciones')
  findMisAsignaciones(@Req() req: Request) {
    // Obtenemos el ID del usuario desde el token
    // --- 👇 CORRECCIÓN (Era .sub, ahora es .id) ---
    const userId = (req.user as any).id;

    // Llamamos a otra NUEVA función en el service
    return this.pendientesService.findForColaborador(userId);
  }

  // --- FIN DE LAS NUEVAS RUTAS ---

  // GET /pendientes/:id
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // TODO: En el futuro, deberíamos verificar que el usuario
    // que pide este ID tenga permiso para verlo.
    return this.pendientesService.findOne(id);
  }

  // PATCH /pendientes/:id
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePendienteDto: UpdatePendienteDto,
  ) {
    // TODO: En el futuro, verificar permisos antes de actualizar
    return this.pendientesService.update(id, updatePendienteDto);
  }

  // DELETE /pendientes/:id
  @UseGuards(JwtAuthGuard) // <-- 3. AÑADIDO (Asegurado)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    // TODO: En el futuro, solo Admins pueden borrar
    return this.pendientesService.remove(id);
  }
}