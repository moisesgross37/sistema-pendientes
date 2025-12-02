import { IsIn, IsString, IsNotEmpty } from 'class-validator';

export class UpdateRolDto {
  @IsString()
  @IsNotEmpty()
  // 👇 AQUÍ FALTABA AGREGAR 'Coordinador' 👇
  @IsIn(['Administrador', 'Colaborador', 'Asesor', 'Coordinador'])
  rol: string;
}