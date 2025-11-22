import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
  UploadedFile, // <--- IMPORTANTE: Nuevo import
  Req,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { CasosService } from './casos.service';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express'; // <--- IMPORTANTE: FileInterceptor singular
import { extname, join } from 'path';
import type { Request, Response } from 'express';
import * as fs from 'fs';

// -------------------------------------------------------
// 🛑 CONSTANTE FIJA: LA MISMA QUE EN PENDIENTES
const UPLOAD_PATH = join(process.cwd(), 'uploads'); 
// -------------------------------------------------------

@Controller('casos')
export class CasosController {
  private readonly logger = new Logger(CasosController.name);

  constructor(private readonly casosService: CasosService) {
    this.logger.log(`🚧 CASOS CONTROLLER: CONECTADO A /var/data`);
  }

  // --- SUBIDA MULTIPLE (POST /casos/upload) ---
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10)) 
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
    if (!files || files.length === 0) {
        throw new HttpException('No se enviaron archivos', HttpStatus.BAD_REQUEST);
    }
    const uploadedFilesInfo: any[] = [];

    try {
        if (!fs.existsSync(UPLOAD_PATH)) {
            fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        }

        files.forEach((file) => {
            const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
            const filename = `${randomName}${extname(file.originalname)}`;
            const fullPath = join(UPLOAD_PATH, filename);

            fs.writeFileSync(fullPath, file.buffer); 

            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}/casos/uploads`; 

            uploadedFilesInfo.push({
                originalName: file.originalname,
                fileName: filename,
                url: `${baseUrl}/${filename}`
            });
        });
        return uploadedFilesInfo;

    } catch (error) {
        this.logger.error(`☠️ ERROR EN CASOS: ${error.message}`);
        throw new HttpException('Error guardando archivos', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // --- SERVIR IMÁGENES (GET /casos/uploads/:filename) ---
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_PATH, filename);
    if (fs.existsSync(fullPath)) {
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        res.status(404).json({ message: 'Imagen no encontrada en disco /var/data' });
    }
  }

  // POST /casos
  @Post()
  create(@Body() createCasoDto: CreateCasoDto) {
    return this.casosService.create(createCasoDto);
  }

  // GET /casos/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.casosService.findOne(id);
  }

  // =====================================================================
  // 🚀 AQUÍ ESTÁ LA MAGIA: PATCH CON SOPORTE DE ARCHIVOS + DATOS
  // =====================================================================
  @Patch(':id')
  @UseInterceptors(FileInterceptor('file')) // <--- Escuchamos la llave 'file' del Frontend
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCasoDto: UpdateCasoDto,
    @UploadedFile() file: Express.Multer.File, // <--- Capturamos el archivo
    @Req() req: Request
  ) {
    
    // 1. LÓGICA DE GUARDADO DE ARCHIVO (Si viene uno nuevo)
    if (file) {
      this.logger.log(`📸 Recibida actualización de imagen para caso #${id}`);
      
      // Crear directorio si no existe
      if (!fs.existsSync(UPLOAD_PATH)) fs.mkdirSync(UPLOAD_PATH, { recursive: true });

      // Generar nombre único
      const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
      const filename = `${randomName}${extname(file.originalname)}`;
      const fullPath = join(UPLOAD_PATH, filename);

      // Guardar en disco
      fs.writeFileSync(fullPath, file.buffer);

      // Generar URL
      const protocol = req.protocol;
      const host = req.get('host');
      const baseUrl = `${protocol}://${host}/casos/uploads`; 
      
      // Asignar la URL al DTO para que se guarde en la BD
      // (Usamos notación de corchetes por si Typescript se queja de que archivoUrl no existe en el DTO)
      updateCasoDto['archivoUrl'] = `${baseUrl}/${filename}`;
    }

    // 2. CORRECCIÓN DE TIPOS (Vital para evitar error 500)
    // FormData convierte los números en Strings. Aquí los devolvemos a números.
    if (updateCasoDto.estadoId) {
        updateCasoDto.estadoId = Number(updateCasoDto.estadoId);
    }

    // 3. Llamar al servicio
    return this.casosService.update(id, updateCasoDto);
  }

  // DELETE /casos/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.casosService.remove(id);
  }
}