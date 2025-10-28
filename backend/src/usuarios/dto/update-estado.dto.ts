import { IsBoolean } from 'class-validator';

export class UpdateEstadoDto {
  @IsBoolean()
  isActive: boolean;
}
