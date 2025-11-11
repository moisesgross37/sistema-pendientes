// backend/src/estados-casos/dto/create-estado-caso.dto.ts
import {
  IsString,
  IsNotEmpty,
  IsHexColor,
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class CreateEstadoCasoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsHexColor() // Valida que sea un color (ej: #FF0000)
  @IsOptional() // Es opcional, usará el default si no se envía
  color?: string;

  @IsBoolean()
  @IsOptional() // Es opcional, usará el default si no se envía
  requiereComentario?: boolean;
}