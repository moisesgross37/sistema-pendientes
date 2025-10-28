import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateRolDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['Administrador', 'Colaborador', 'Asesor'])
  rol: string;
}
