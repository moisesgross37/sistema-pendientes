import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

// Este es un DTO "hijo" que define cómo luce
// un caso simple dentro del formulario de creación.
class CreateCasoInputDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  // --- 👇 AÑADIDO ---
  @IsArray()
  @IsString({ each: true }) // Valida que cada elemento del array sea un string
  imagenes: string[];
  // --- 👆 ---
}

// Este es el DTO principal, ahora modificado
export class CreatePendienteDto {
  @IsString()
  @IsNotEmpty()
  nombreCentro: string;

  @IsNumber()
  asesorId: number;

  // --- CAMPOS ELIMINADOS ---
  // Ya no recibimos 'descripcion' ni 'imagenes' a nivel de Pendiente
  // descripcion?: string;
  // imagenes?: string[];

  // --- CAMPO NUEVO ---
  // En su lugar, recibimos un array de 'casos'
  @IsArray()
  @ValidateNested({ each: true }) // Valida cada objeto en el array
  @Type(() => CreateCasoInputDto) // Le dice a class-validator qué clase usar
  casos: CreateCasoInputDto[];
}