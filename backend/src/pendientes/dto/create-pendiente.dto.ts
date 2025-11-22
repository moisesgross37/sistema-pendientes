import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional, // <--- Importante: Añadimos IsOptional
} from 'class-validator';

// DTO "Hijo" (Caso)
class CreateCasoInputDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsArray()
  @IsString({ each: true }) 
  imagenes: string[];
}

// DTO Principal (Pendiente)
export class CreatePendienteDto {
  @IsString()
  @IsNotEmpty()
  nombreCentro: string;

  @IsNumber()
  asesorId: number;

  // --- 👇 CAMPO NUEVO NECESARIO PARA LA MEJORA 👇 ---
  @IsString()
  @IsOptional() // Es opcional porque si no mandan nada, asumimos 'General'
  area?: string; 
  // --------------------------------------------------

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCasoInputDto)
  casos: CreateCasoInputDto[];
}