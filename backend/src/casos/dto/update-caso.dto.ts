// backend/src/casos/dto/update-caso.dto.ts
import {
  IsNumber,
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer'; // <--- 1. IMPORTAR ESTO ES OBLIGATORIO

export class UpdateCasoDto {

  @IsNumber()
  @IsOptional()
  @Type(() => Number) // <--- 2. ESTA ES LA CURA: Convierte el texto "2" en número 2 automáticamente
  estadoId?: number;

  @IsString()
  @IsOptional()
  @MinLength(0)
  comentario?: string | null;

  // (Opcional) Agregamos esto para que no se queje si guardamos la URL de la foto
  @IsString()
  @IsOptional()
  archivoUrl?: string;
}