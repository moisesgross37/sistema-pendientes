import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCasoDto {
  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  imagenes: string[];
  
  // Este es el ID del Pendiente (Proyecto) al que pertenece
  @IsNumber()
  @IsNotEmpty()
  pendienteId: number;
}