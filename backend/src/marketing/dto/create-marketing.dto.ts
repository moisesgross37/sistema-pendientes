import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateMarketingDto {
  @IsString()
  @IsNotEmpty()
  nombre_centro: string;

  @IsString()
  @IsOptional()
  directivo_nombre?: string;

  @IsString()
  @IsOptional()
  directivo_tel?: string;

  @IsString()
  @IsOptional()
  estudiante_nombre?: string;

  @IsString()
  @IsOptional()
  estudiante_tel?: string;
}