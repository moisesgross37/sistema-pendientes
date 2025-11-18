import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Res,
  Req,
  ParseIntPipe,
  ForbiddenException, // <--- 1. AÑADIDO (Necesario para la seguridad)
} from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Request, Response } from 'express';
// Forzando actualización de ruta
@Controller('pendientes')
export class PendientesController {
  constructor(private readonly pendientesService: PendientesService) {}

  // POST /pendientes/upload
  // Guarda las imágenes en el Disco Persistente de Render
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        // 👇 RUTA CORRECTA según tu configuración de Render
        destination: '/opt/render/project/src/uploads',
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
  // Sirve las imágenes desde el Disco Persistente
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    // 👇 RUTA CORRECTA para leer del disco
    res.sendFile(filename, { root: '/opt/render/project/src/uploads' });
  }

  // POST /pendientes
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  // GET /pendientes (SOLO PARA ADMINS)
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.pendientesService.findAll();
  }

  // --- NUEVAS RUTAS DE ROLES ---

  // GET /pendientes/mis-proyectos (PARA ASESORES)
  @UseGuards(JwtAuthGuard)
  @Get('mis-proyectos')
  findMisProyectos(@Req() req: Request) {
    const userId = (req.user as any).id; // Corregido: usa .id
    return this.pendientesService.findForAsesor(userId);
  }

  // GET /pendientes/mis-asignaciones (PARA COLABORADORES)
  @UseGuards(JwtAuthGuard)
  @Get('mis-asignaciones')
  findMisAsignaciones(@Req() req: Request) {
    const userId = (req.user as any).id; // Corregido: usa .id
    return this.pendientesService.findForColaborador(userId);
  }

  // --- FIN NUEVAS RUTAS ---

  // GET /pendientes/:id
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pendientesService.findOne(id);
  }

  // PATCH /pendientes/:id
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePendienteDto: UpdatePendienteDto,
  ) {
    return this.pendientesService.update(id, updatePendienteDto);
  }

  // DELETE /pendientes/:id
  // 🛡️ AHORA SEGURO: Solo el Administrador puede borrar
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request, // Inyectamos Request para ver quién es el usuario
  ) {
    const user = req.user as any;
    
    // Validación de seguridad
    if (user.rol !== 'Administrador') {
      throw new ForbiddenException(
        'Acción no permitida. Solo los administradores pueden eliminar proyectos.',
      );
    }

    return this.pendientesService.remove(id);
  }
}