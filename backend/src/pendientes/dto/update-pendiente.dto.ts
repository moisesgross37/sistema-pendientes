import { IsEnum, IsNumber, IsOptional } from 'class-validator';

export class UpdatePendienteDto {
  @IsOptional()
  @IsEnum(['Por Asignar', 'Asignado', 'En Proceso', 'Concluido'])
  status?: string;

  @IsOptional()
  @IsNumber()
  colaboradorAsignadoId?: number;
}