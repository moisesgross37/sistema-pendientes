import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('usuarios')
@UseGuards(JwtAuthGuard) // Seguridad reactivada para todo el controlador
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Request() req, @Body() createUsuarioDto: CreateUsuarioDto) {
    // Verificación de rol reactivada
    if (req.user.rol !== 'Administrador') {
     throw new ForbiddenException('Solo los administradores pueden crear usuarios.');
    }
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  findAll(@Request() req) {
    // Verificación de rol
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden ver la lista de usuarios.');
    }
    return this.usuariosService.findAll();
  }
}
