// backend/src/casos/dto/update-caso.dto.ts
import {
  IsNumber,
  IsString,
  IsOptional,
  MinLength,
} from 'class-validator';

// Este DTO define lo que el frontend envía
// cuando se presiona "Guardar Caso" en el modal de detalles.
export class UpdateCasoDto {

  // Ya no recibimos 'status' (string), recibimos el ID del estado
  @IsNumber()
  @IsOptional() // Hacemos que sea opcional (por si solo se actualiza el comentario)
  estadoId?: number;

  @IsString()
  @IsOptional()
  @MinLength(0) // Permitimos que sea un string vacío (para borrar el comentario)
  comentario?: string | null;
}