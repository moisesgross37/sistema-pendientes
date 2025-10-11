import { Controller, Get, Post, Body, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // La creación de usuarios está protegida y verifica el rol de Admin
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() createUsuarioDto: CreateUsuarioDto) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden crear usuarios.');
    }
    return this.usuariosService.create(createUsuarioDto);
  }

  // La búsqueda de todos los usuarios está protegida y verifica el rol de Admin
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden ver la lista de usuarios.');
    }
    return this.usuariosService.findAll();
  }
}
