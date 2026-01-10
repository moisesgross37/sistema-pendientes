import { PartialType } from '@nestjs/mapped-types';
import { CreateUsuarioDto } from './create-usuario.dto';
import { IsOptional, IsArray, IsString } from 'class-validator';

export class UpdateUsuarioDto extends PartialType(CreateUsuarioDto) {
    @IsOptional()
    @IsArray()
    @IsString({ each: true }) // 👈 Aceptamos Texto ("Artes")
    departamentos?: string[];
}