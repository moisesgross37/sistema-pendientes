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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import type { Request, Response } from 'express';
import * as fs from 'fs';

// RUTA DEL DISCO PERSISTENTE
const RENDER_DISK_PATH = '/opt/render/project/src/uploads';
const LOCAL_PATH = join(process.cwd(), 'uploads');
// Si existe la carpeta de Render, la usamos. Si no, local.
const UPLOAD_PATH = fs.existsSync(RENDER_DISK_PATH) ? RENDER_DISK_PATH : LOCAL_PATH;

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log(`🔧 MODO MANUAL ACTIVADO`);
    this.logger.log(`📂 Objetivo de guardado: ${UPLOAD_PATH}`);
  }

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  // IMPORTANTE: Quitamos 'diskStorage' para manejar el archivo en memoria (buffer) nosotros mismos
  @UseInterceptors(FilesInterceptor('files', 10)) 
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
    
    if (!files || files.length === 0) {
        throw new HttpException('No se enviaron archivos', HttpStatus.BAD_REQUEST);
    }

    const uploadedFilesInfo = [];

    this.logger.log(`📥 Recibidos ${files.length} archivos para guardar manualmente...`);

    try {
        // Asegurar que la carpeta exista
        if (!fs.existsSync(UPLOAD_PATH)) {
            this.logger.warn(`⚠️ La carpeta no existía. Creándola: ${UPLOAD_PATH}`);
            fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        }

        files.forEach((file) => {
            // 1. Generar nombre único
            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
            const filename = `${randomName}${extname(file.originalname)}`;
            
            // 2. Definir ruta completa
            const fullPath = join(UPLOAD_PATH, filename);

            // 3. ESCRIBIR EL ARCHIVO MANUALMENTE (Aquí es donde forzamos el guardado)
            this.logger.log(`✍️ Escribiendo archivo en: ${fullPath}`);
            fs.writeFileSync(fullPath, file.buffer); // <-- ESTO ES LO CLAVE

            // 4. VERIFICACIÓN INMEDIATA (El "Chivato")
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                this.logger.log(`✅ CONFIRMADO: Archivo guardado. Tamaño: ${stats.size} bytes`);
            } else {
                this.logger.error(`❌ ERROR CRÍTICO: El archivo se escribió pero no aparece.`);
            }

            // Construir URL para el frontend
            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}/pendientes/uploads`;

            uploadedFilesInfo.push({
                originalName: file.originalname,
                fileName: filename,
                url: `${baseUrl}/${filename}`
            });
        });

        // Auditoría final de la carpeta
        const folderContent = fs.readdirSync(UPLOAD_PATH);
        this.logger.log(`📊 Archivos actuales en carpeta (${folderContent.length}): ${folderContent.slice(-3)}...`);

        return uploadedFilesInfo;

    } catch (error) {
        this.logger.error(`☠️ ERROR FATAL AL GUARDAR: ${error.message}`, error.stack);
        throw new HttpException('Error interno guardando archivos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /pendientes/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_PATH, filename);
    // this.logger.log(`🔍 Buscando archivo: ${fullPath}`); // Descomentar si quieres mucho spam
    
    if (fs.existsSync(fullPath)) {
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        this.logger.error(`[404] Archivo no encontrado: ${fullPath}`);
        res.status(404).json({ message: 'Imagen no encontrada' });
    }
  }

  // --- RESTO DE MÉTODOS (No cambian) ---

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