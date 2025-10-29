// backend/src/pendientes/dto/update-pendiente.dto.ts
import { IsEnum, IsNumber, IsOptional, ValidateIf } from 'class-validator'; // <--- Añadir ValidateIf

export class UpdatePendienteDto {
  @IsOptional()
  @IsEnum([
    'Por Asignar', 'Asignado', 'En Proceso', 'Concluido',
    'Iniciado', 'Fuera de oficina', 'En administración'
  ])
  status?: string;

  // 👇 --- CAMBIOS AQUÍ ---
  @IsOptional()
  @ValidateIf((_object, value) => value !== null) // Solo valida si no es null
  @IsNumber() // Asegura que si no es null, sea un número
  colaboradorAsignadoId?: number | null; // Permite que el tipo sea null
  // 👆 --- FIN DE CAMBIOS ---
}
