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

// --- CONFIGURACIÓN INTELIGENTE DE RUTAS ---
// Si estamos en Render (existe la variable RENDER), usamos el disco persistente.
// Si estamos en local, usamos una carpeta './uploads' en tu proyecto.
const IS_RENDER = process.env.RENDER === 'true';
const UPLOAD_PATH = IS_RENDER 
  ? '/opt/render/project/src/uploads'  // Ruta del Disco en Render
  : join(process.cwd(), 'uploads');    // Ruta Local en tu PC

// Aseguramos que la carpeta exista al iniciar (para evitar errores de "no such file")
if (!fs.existsSync(UPLOAD_PATH)) {
  fs.mkdirSync(UPLOAD_PATH, { recursive: true });
  console.log(`[INIT] Carpeta de uploads creada en: ${UPLOAD_PATH}`);
}

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log(`🚀 PENDIENTES CONTROLLER ACTIVO`);
    this.logger.log(`📂 Guardando archivos en: ${UPLOAD_PATH}`);
  }

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          // Usamos la constante global UPLOAD_PATH
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
    // Construir la URL base dinámicamente (http://tusitio.com/pendientes/uploads/...)
    const protocol = req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}/pendientes/uploads`;

    this.logger.log(`Archivos procesados: ${files ? files.length : 0} en ruta ${UPLOAD_PATH}`);
    
    return files ? files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
      // AQUÍ LA MAGIA: Devolvemos la ruta completa para que el frontend no falle
      url: `${baseUrl}/${file.filename}` 
    })) : [];
  }

  // GET /pendientes/uploads/:filename
  // Este endpoint sirve la imagen desde el disco persistente
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    this.logger.log(`[LEER] Solicitud de archivo: ${filename}`);
    
    // Verificamos si existe antes de enviarlo para evitar crasheos
    const fullPath = join(UPLOAD_PATH, filename);
    
    if (fs.existsSync(fullPath)) {
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        this.logger.error(`[ERROR] Archivo no encontrado físicamente: ${fullPath}`);
        res.status(404).json({ message: 'Imagen no encontrada o eliminada' });
    }
  }

  // --- RESTO DE MÉTODOS (Sin cambios) ---
  
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