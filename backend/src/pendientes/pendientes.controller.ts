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
import { extname } from 'path';
import type { Request, Response } from 'express';
import * as fs from 'fs';

@Controller('pendientes')
export class PendientesController {
  private readonly logger = new Logger(PendientesController.name);

  constructor(private readonly pendientesService: PendientesService) {
    this.logger.log('🚀 PENDIENTES CONTROLLER V2.1 (DEBUG MODE) INICIADO 🚀');
  }

  // POST /pendientes/upload
  @UseGuards(JwtAuthGuard)
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const rutaObjetivo = '/opt/render/project/src/uploads';
          
          // DIAGNÓSTICO EN TIEMPO REAL
          console.log(`[DEBUG] ------------------------------------------------`);
          console.log(`[DEBUG] Multer intentando guardar: ${file.originalname}`);
          console.log(`[DEBUG] Ruta configurada: ${rutaObjetivo}`);

          // Verificar si la carpeta existe FÍSICAMENTE
          if (fs.existsSync(rutaObjetivo)) {
             console.log(`[DEBUG] ✅ La carpeta EXISTE. Permisos OK.`);
             cb(null, rutaObjetivo);
          } else {
             console.error(`[DEBUG] ❌ La carpeta NO EXISTE. Intentando crearla...`);
             try {
               fs.mkdirSync(rutaObjetivo, { recursive: true });
               console.log(`[DEBUG] ✅ Carpeta creada exitosamente.`);
               cb(null, rutaObjetivo);
             } catch (error) {
               console.error(`[DEBUG] 💀 ERROR FATAL creando carpeta:`, error);
               // CORRECCIÓN AQUÍ: Pasamos '' en lugar de null para satisfacer a TypeScript
               cb(error as Error, '');
             }
          }
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
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>) {
    this.logger.log(`Archivos procesados: ${files ? files.length : 0}`);
    if(files) {
        files.forEach(f => this.logger.log(`Guardado en: ${f.path}`));
    }
    
    return files ? files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
    })) : [];
  }

  // GET /pendientes/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const ruta = '/opt/render/project/src/uploads';
    this.logger.log(`[LEER] Intentando servir: ${filename} desde ${ruta}`);
    res.sendFile(filename, { root: ruta });
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