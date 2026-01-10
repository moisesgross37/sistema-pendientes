import { IsString, MinLength, IsOptional, IsBoolean, IsArray } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  nombreCompleto: string;

  @IsString()
  @MinLength(4)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  rol?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true }) 
  departamentos?: string[]; 
} 
// 👆 ¡ESTA LLAVE DEL FINAL ES LA QUE FALTABA!