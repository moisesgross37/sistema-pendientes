import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseInterceptors, // <--- 1. IMPORTACIÓN NUEVA
  UploadedFiles, // <--- 2. IMPORTACIÓN NUEVA
} from '@nestjs/common';
import { CasosService } from './casos.service';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { FilesInterceptor } from '@nestjs/platform-express'; // <--- 3. IMPORTACIÓN NUEVA
import { diskStorage } from 'multer'; // <--- 4. IMPORTACIÓN NUEVA
import { extname, join } from 'path'; // <--- 5. IMPORTACIÓN NUEVA

// (Recuerda que comentamos el JwtAuthGuard porque no existía)
// @UseGuards(JwtAuthGuard)
@Controller('casos')
export class CasosController {
  constructor(private readonly casosService: CasosService) {}

  // --- 👇 6. RUTA NUEVA AÑADIDA ---
  // POST /casos/upload
  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 10, { // Acepta hasta 10 archivos bajo el nombre 'files'
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads'), // Guarda en la carpeta 'uploads'
        filename: (req, file, cb) => {
          // Genera un nombre aleatorio para el archivo
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
    // Devuelve los nombres de los archivos subidos
    return files.map((file) => ({
      originalName: file.originalname,
      fileName: file.filename,
    }));
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