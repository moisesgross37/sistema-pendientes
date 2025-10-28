import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4) // Puedes poner un mínimo más alto si quieres
  password: string;
}
