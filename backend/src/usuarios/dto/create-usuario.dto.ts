import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @IsNotEmpty()
  nombreCompleto: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsIn(['Administrador', 'Coordinador', 'Asesor', 'Colaborador'])
  rol: string;
}