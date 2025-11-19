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

// -------------------------------------------------------
// 🛑 CONSTANTE FIJA: SIN AUTO-DETECTAR
// OBLIGAMOS a usar el disco persistente de Render
const UPLOAD_PATH = '/var/data'; 
// -------------------------------------------------------

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log(`🚧 MODO FUERZA BRUTA ACTIVADO`);
    this.logger.log(`🎯 Destino OBLIGATORIO: ${UPLOAD_PATH}`);
    
    // Verificación inicial al arrancar
    try {
        if (fs.existsSync(UPLOAD_PATH)) {
            this.logger.log('✅ La carpeta /var/data existe y es accesible.');
            // Prueba de escritura al inicio
            fs.writeFileSync(`${UPLOAD_PATH}/test_inicio.txt`, 'Hola desde el arranque');
        } else {
            this.logger.error('❌ ¡ALERTA! /var/data NO existe. El disco no está montado.');
        }
    } catch (e) {
        this.logger.error(`❌ Error verificando disco: ${e.message}`);
    }
  }

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10)) 
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
    
    if (!files || files.length === 0) {
        throw new HttpException('No se enviaron archivos', HttpStatus.BAD_REQUEST);
    }

    const uploadedFilesInfo: any[] = [];
    this.logger.log(`📥 Intentando guardar ${files.length} archivos en ${UPLOAD_PATH}...`);

    try {
        // Si la carpeta no existe, intentamos crearla (aunque debería ser el disco)
        if (!fs.existsSync(UPLOAD_PATH)) {
            fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        }

        files.forEach((file) => {
            // Validar que tenemos datos
            if (!file.buffer) {
                this.logger.error(`❌ El archivo ${file.originalname} llegó sin contenido (buffer vacío).`);
                return;
            }

            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
            const filename = `${randomName}${extname(file.originalname)}`;
            const fullPath = join(UPLOAD_PATH, filename);

            // ESCRIBIR (Sync para asegurar)
            fs.writeFileSync(fullPath, file.buffer); 

            // CHIVATO: Verificar si se escribió
            const stats = fs.statSync(fullPath);
            this.logger.log(`💾 GUARDADO OK: ${filename} (${stats.size} bytes)`);

            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}/pendientes/uploads`;

            uploadedFilesInfo.push({
                originalName: file.originalname,
                fileName: filename,
                url: `${baseUrl}/${filename}`
            });
        });

        // AUDITORÍA: Listar qué hay en la carpeta ahora mismo
        const directoryContents = fs.readdirSync(UPLOAD_PATH);
        this.logger.log(`📂 CONTENIDO ACTUAL DE /var/data: [${directoryContents.join(', ')}]`);

        return uploadedFilesInfo;

    } catch (error) {
        this.logger.error(`☠️ ERROR CRÍTICO: ${error.message}`, error.stack);
        throw new HttpException('Error guardando archivos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // GET /pendientes/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_PATH, filename);
    
    if (fs.existsSync(fullPath)) {
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        this.logger.warn(`🔍 404 - Se buscó: ${fullPath} y no estaba.`);
        res.status(404).json({ message: 'Imagen no encontrada' });
    }
  }

  // --- RESTO DE MÉTODOS ---
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
  update(@Param('id', ParseIntPipe) id: number, @Body() updatePendienteDto: UpdatePendienteDto) {
    return this.pendientesService.update(id, updatePendienteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    if (user.rol !== 'Administrador') {
      throw new ForbiddenException('Acción no permitida.');
    }
    return this.pendientesService.remove(id);
  }
}