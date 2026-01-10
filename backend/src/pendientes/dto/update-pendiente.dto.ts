// backend/src/pendientes/dto/update-pendiente.dto.ts
// ARCHIVO CORREGIDO Y LISTO PARA 'EN REVISIÓN'

import { IsIn, IsNumber, IsOptional, ValidateIf, IsArray } from 'class-validator';

export class UpdatePendienteDto {
  @IsOptional()
  @IsIn([
    'STANDBY',
    'Por Asignar',
    'Pendiente',     // Azul
    'En Proceso',    // Azul oscuro
    'En Revisión',   // 👈 EL PASE VIP: Ahora sí lo permitimos
    'Concluido',     // Verde
    'Archivado',
    'Entregado'
  ])
  status?: string;

  // Mantenemos tu lógica de colaborador (estaba bien)
  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsNumber()
  colaboradorAsignadoId?: number | null;

  // 👇 AGREGADO: Vital para guardar la firma de quien envió a revisión
  @IsOptional()
  @IsArray()
  historial?: any[];
}