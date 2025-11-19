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
  Req,
  HttpException,
  HttpStatus,
  Logger,
  Res,
} from '@nestjs/common';
import { CasosService } from './casos.service';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { extname, join } from 'path';
import type { Request, Response } from 'express';
import * as fs from 'fs';

// -------------------------------------------------------
// 🛑 CONSTANTE FIJA: LA MISMA QUE EN PENDIENTES
// Todos los controladores deben apuntar al MISMO DISCO
const UPLOAD_PATH = '/var/data'; 
// -------------------------------------------------------

// (Mantenemos el Guard comentado como lo tenías)
// @UseGuards(JwtAuthGuard)
@Controller('casos')
export class CasosController {
  private readonly logger = new Logger(CasosController.name);

  constructor(private readonly casosService: CasosService) {
    this.logger.log(`🚧 CASOS CONTROLLER: CONECTADO A /var/data`);
  }

  // --- 👇 6. SUBIDA ARREGLADA (MODO FUERZA BRUTA) ---
  // POST /casos/upload
  @Post('upload')
  @UseInterceptors(FilesInterceptor('files', 10)) // Quitamos diskStorage para manejarlo manual
  uploadFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: Request) {
    
    if (!files || files.length === 0) {
        throw new HttpException('No se enviaron archivos', HttpStatus.BAD_REQUEST);
    }

    const uploadedFilesInfo: any[] = [];
    this.logger.log(`📥 CASOS: Recibiendo ${files.length} archivos...`);

    try {
        // Asegurar que la carpeta existe
        if (!fs.existsSync(UPLOAD_PATH)) {
            fs.mkdirSync(UPLOAD_PATH, { recursive: true });
        }

        files.forEach((file) => {
            // Generar nombre
            const randomName = Array(32)
                .fill(null)
                .map(() => Math.round(Math.random() * 16).toString(16))
                .join('');
            const filename = `${randomName}${extname(file.originalname)}`;
            
            // Ruta completa en el disco seguro
            const fullPath = join(UPLOAD_PATH, filename);

            // ESCRIBIR MANUALMENTE (Fuerza Bruta)
            this.logger.log(`✍️ CASOS: Escribiendo en ${fullPath}`);
            fs.writeFileSync(fullPath, file.buffer); 

            // Construir URL
            // Nota: Dependiendo de cómo lo pida el front, puede que necesites
            // apuntar a /casos/uploads o /pendientes/uploads.
            // Por ahora lo dejamos apuntando a este controlador.
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

  // --- NUEVO: Endpoint para leer las imágenes desde Casos ---
  // GET /casos/uploads/:filename
  @Get('uploads/:filename')
  serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const fullPath = join(UPLOAD_PATH, filename);
    if (fs.existsSync(fullPath)) {
        res.sendFile(filename, { root: UPLOAD_PATH });
    } else {
        res.status(404).json({ message: 'Imagen no encontrada en disco /var/data' });
    }
  }
  // --- 👆 ---

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

  // PATCH /casos/:id
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCasoDto: UpdateCasoDto,
  ) {
    return this.casosService.update(id, updateCasoDto);
  }

  // DELETE /casos/:id
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.casosService.remove(id);
  }
}