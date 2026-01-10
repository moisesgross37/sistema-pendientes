import {
  IsNumber,
  IsString,
  IsOptional,
  MinLength,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCasoDto {

  // --- 1. ESTADO Y RELOJ ---
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  estadoId?: number;

  // --- 2. RESPONSABLE (La carrera de relevos) ---
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  responsableId?: number; // <--- AGREGADO: Para poder cambiar quién tiene la tarea

  // --- 3. DATOS GENERALES (Para que no den error) ---
  @IsString()
  @IsOptional()
  descripcion?: string;

  @IsString()
  @IsOptional()
  tipo_servicio?: string;

  @IsString()
  @IsOptional()
  @MinLength(0)
  comentario?: string | null;

  @IsString()
  @IsOptional()
  archivoUrl?: string;

  @IsArray()
  @IsOptional()
  imagenes?: string[];
}