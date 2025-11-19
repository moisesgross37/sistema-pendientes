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
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Request, Response } from 'express';
import * as fs from 'fs';

// --- CONFIGURACIÓN A PRUEBA DE BALAS V3 ---
// Definimos la ruta exacta del disco de Render
const RENDER_DISK_PATH = '/opt/render/project/src/uploads';

// Preguntamos al sistema: ¿Existe esta carpeta física?
const IS_RENDER_DISK_AVAILABLE = fs.existsSync(RENDER_DISK_PATH);

// Si existe la carpeta de Render, úsala. Si no, usa la carpeta local del proyecto.
const UPLOAD_PATH = IS_RENDER_DISK_AVAILABLE 
  ? RENDER_DISK_PATH 
  : join(process.cwd(), 'uploads');

// Nos aseguramos de que la carpeta local exista si estamos trabajando en la PC
if (!IS_RENDER_DISK_AVAILABLE && !fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
}

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log(`🚀 PENDIENTES CONTROLLER V3 (AUTO-DETECT)`);
    this.logger.log(`💾 MODO DETECTADO: ${IS_RENDER_DISK_AVAILABLE ? 'PRODUCCIÓN (Render Disk)' : 'LOCAL (PC)'}`);
    this.logger.log(`📂 Ruta de guardado activa: ${UPLOAD_PATH}`);
  }

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Usamos la ruta calculada automáticamente
          cb(null, UPLOAD_PATH);
        },
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
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
    // Construir la URL completa para que el Frontend no tenga que adivinar
    const protocol = req.protocol;
    const host = req.get('host');
    // Esta URL apunta a este mismo controlador
    const baseUrl = `${protocol}://${host}/pendientes/uploads`;

    this.logger.log(`Subida exitosa. Archivos: ${files ? files.length : 0}`);
    
    return files ? files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
      // Devolvemos la URL lista para usar en el navegador
      url: `${baseUrl}/${file.filename}` 
    })) : [];
  }

  // GET /pendientes/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_PATH, filename);
    
    if (fs.existsSync(fullPath)) {
        // Servimos el archivo desde la ruta calculada (sea Render o Local)
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        this.logger.error(`[404] Archivo no encontrado: ${fullPath}`);
        res.status(404).json({ 
            message: 'Imagen no encontrada o eliminada',
            path: fullPath 
        });
    }
  }

  // --- MÉTODOS ESTÁNDAR (Sin cambios) ---
  
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll() {
    return this.pendientesService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-proyectos')
  findMisProyectos(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.pendientesService.findForAsesor(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mis-asignaciones')
  findMisAsignaciones(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.pendientesService.findForColaborador(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.pendientesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePendienteDto: UpdatePendienteDto,
  ) {
    return this.pendientesService.update(id, updatePendienteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    if (user.rol !== 'Administrador') {
      throw new ForbiddenException(
        'Acción no permitida. Solo los administradores pueden eliminar proyectos.',
      );
    }
    return this.pendientesService.remove(id);
  }
}