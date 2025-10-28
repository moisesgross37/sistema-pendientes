import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdatePendienteDto {
  @IsOptional()
  @IsEnum([
    'Por Asignar',
    'Asignado',
    'En Proceso',
    'Concluido',
    // 👇 AÑADIMOS LOS VALORES QUE FALTABAN
    'Iniciado',
    'Fuera de oficina',
    'En administración' 
  ])
  status?: string;

  @IsOptional()
  @IsNumber()
  colaboradorAsignadoId?: number;
}
