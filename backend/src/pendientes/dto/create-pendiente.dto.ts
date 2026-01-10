// backend/src/pendientes/dto/create-pendiente.dto.ts
// ARCHIVO FUSIONADO Y CORREGIDO

import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn
} from 'class-validator';

// DTO "Hijo" (Caso) - CORREGIDO ✅
class CreateCasoInputDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  // 👇 ¡ESTE ES EL CAMBIO MÁGICO! 👇
  @IsOptional()
  @IsString()
  tipo_servicio?: string; 
  // 👆 Ahora el sistema dejará pasar el título (ej: "Diseño Gráfico")

  @IsArray()
  @IsString({ each: true }) 
  imagenes: string[];
}

// DTO Principal (Pendiente)
export class CreatePendienteDto {
  // --- 1. CAMPOS ORIGINALES (Que tu servicio necesita) ---
  @IsString()
  @IsNotEmpty()
  nombreCentro: string;

  @IsNumber()
  asesorId: number; // 👈 Este era el que faltaba y rompía el servicio

  @IsString()
  @IsOptional()
  area?: string; 

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCasoInputDto)
  casos: CreateCasoInputDto[]; // 👈 Este también faltaba

  // --- 2. CAMPOS NUEVOS (Para que funcione el botón de revisión) ---
  
  @IsOptional()
  @IsInt()
  colaboradorId?: number; 

  @IsOptional()
  @IsString()
  // 👇 AQUÍ ESTÁ LA MAGIA: Agregamos "En Revisión"
  @IsIn([
    'STANDBY', 
    'Por Asignar', 
    'Pendiente', 
    'En Proceso', 
    'En Revisión', // <--- ¡PERMISO AGREGADO!
    'Concluido', 
    'Archivado', 
    'Entregado'
  ])
  status?: string;

  @IsOptional()
  @IsBoolean()
  esHito?: boolean;

  @IsOptional()
  @IsString()
  eventoKey?: string;

  @IsOptional()
  @IsString()
  tipoHito?: string;

  @IsOptional()
  @IsArray()
  historial?: any[];
}