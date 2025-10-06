import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePendienteDto {
  @IsString()
  @IsNotEmpty()
  nombreCentro: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsNumber()
  @IsNotEmpty()
  asesorId: number;

  // --- CÓDIGO AÑADIDO ---
  @IsArray()
  @IsString({ each: true }) // Valida que cada elemento del array sea un string
  @IsOptional() // El campo es opcional, se puede crear un pendiente sin imágenes
  imagenes?: string[];
}