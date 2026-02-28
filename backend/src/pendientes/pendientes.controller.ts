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
import { extname, join, resolve } from 'path'; // Agregamos resolve
import type { Request, Response } from 'express';
import * as fs from 'fs';

import { GetUser } from '../auth/decorators/get-user.decorator';
import { Usuario } from '../usuarios/entities/usuario.entity';

// -------------------------------------------------------
// 🧠 CONFIGURACIÓN DINÁMICA (INTELIGENTE)
// Si existe la variable en .env (Local), úsala. Si no, usa Render (/var/data).
// -------------------------------------------------------
const ENV_PATH = process.env.STORAGE_PATH; 
const UPLOAD_PATH = ENV_PATH ? resolve(ENV_PATH) : '/var/data';

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log(`🚧 INICIANDO GESTOR DE ARCHIVOS`);
    this.logger.log(`🎯 Ruta detectada: ${UPLOAD_PATH}`);
    
    // Verificación inicial al arrancar
    try {
        if (!fs.existsSync(UPLOAD_PATH)) {
            this.logger.warn(`⚠️ La carpeta ${UPLOAD_PATH} no existe. Creándola automáticamente...`);
            fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        }
        
        // Prueba de escritura para asegurar permisos
        const testFile = join(UPLOAD_PATH, 'test_permisos.txt');
        fs.writeFileSync(testFile, 'Sistema listo para recibir fotos.');
        this.logger.log('✅ Sistema de archivos VERIFICADO y LISTO.');
        
    } catch (e) {
        this.logger.error(`❌ Error crítico en disco: ${e.message}`);
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
    this.logger.log(`📥 Recibiendo ${files.length} archivos para guardar en: ${UPLOAD_PATH}`);

    try {
        files.forEach((file) => {
            if (!file.buffer) {
                this.logger.error(`❌ Archivo vacío: ${file.originalname}`);
                return;
            }

            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
            const filename = `${randomName}${extname(file.originalname)}`;
            const fullPath = join(UPLOAD_PATH, filename);

            // ESCRIBIR ARCHIVO
            fs.writeFileSync(fullPath, file.buffer); 

            // Verificar tamaño
            const stats = fs.statSync(fullPath);
            this.logger.log(`💾 GUARDADO: ${filename} (${stats.size} bytes)`);

            const protocol = req.protocol;
            const host = req.get('host');
            // Nota: Aquí construimos la URL pública para acceder luego
            const baseUrl = `${protocol}://${host}/pendientes/uploads`;

            uploadedFilesInfo.push({
                originalName: file.originalname,
                fileName: filename,
                url: `${baseUrl}/${filename}`
            });
        });

        return uploadedFilesInfo;

    } catch (error) {
        this.logger.error(`☠️ ERROR AL GUARDAR: ${error.message}`, error.stack);
        throw new HttpException('Error guardando archivos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ========================================================
  // 📸 VISOR DE IMÁGENES (INTELIGENCIA HÍBRIDA MAC/NUBE)
  // ========================================================
  @Get('uploads/:img')
  serveFile(@Param('img') img: string, @Res() res: Response) {
    
    // 1. INTENTO LOCAL (Para tu Mac)
    // Busca en la carpeta 'uploads' dentro de la raiz del proyecto
    const rutaLocal = join(process.cwd(), 'uploads', img);

    // 2. INTENTO NUBE (Para Render)
    // Busca en la carpeta del sistema /var/data
    const rutaNube = join('/var/data', img);

    // 🕵️‍♂️ DETECTIVE DE ARCHIVOS
    if (fs.existsSync(rutaLocal)) {
        // ¡La encontré en tu Mac!
        return res.sendFile(rutaLocal);
    } 
    else if (fs.existsSync(rutaNube)) {
        // ¡La encontré en la Nube!
        return res.sendFile(rutaNube);
    } 
    else {
        // ❌ No está en ningún lado
        return res.status(404).json({ message: 'Imagen no encontrada en el servidor' });
    }
  }// ==========================================
  // 📝 NUEVA RUTA: AGREGAR COMENTARIO (BLINDADA)
  // ==========================================
  @Post(':id/historial')
  async agregarComentario(
    @Param('id') id: number,
    @Body() body: { nota: string; accion?: string; autor?: string }, // 👈 Agregamos autor aquí
    @Req() req: any,
  ) {
    // 🛡️ LÓGICA DE PRIORIDAD:
    // 1. Usamos el autor que viene en el body (del Frontend).
    // 2. Si no viene, usamos el nombre de la sesión (req.user).
    // 3. Si nada funciona, ponemos 'SISTEMA'.
    const nombreAutor = body.autor || (req.user && req.user.username) || 'SISTEMA';

    return this.pendientesService.agregarComentario(
      Number(id),
      body.nota,
      nombreAutor, 
      body.accion || 'COMENTARIO',
    );
  }
  
  // --- RESTO DE MÉTODOS (SIN CAMBIOS) ---
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() createPendienteDto: CreatePendienteDto) {
    return this.pendientesService.create(createPendienteDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@GetUser() user: Usuario) { 
    return this.pendientesService.findAll(user); 
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