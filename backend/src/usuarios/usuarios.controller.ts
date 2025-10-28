import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Patch, // <-- Nuevo Import
  Param, // <-- Nuevo Import
  ParseIntPipe, // <-- Nuevo Import
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
// --- Nuevos Imports ---
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

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

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS RUTAS 🚀 =====
  // ================================================================

  @Patch(':id/rol')
  @UseGuards(JwtAuthGuard)
  async updateRol(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
  ) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden cambiar roles.');
    }
    return this.usuariosService.updateRol(id, updateRolDto);
  }

  @Patch(':id/estado')
  @UseGuards(JwtAuthGuard)
  async updateEstado(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoDto,
  ) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden cambiar el estado.');
    }
    return this.usuariosService.updateEstado(id, updateEstadoDto);
  }

  // ================================================================
  // ===== 🚀 FIN DE LAS NUEVAS RUTAS 🚀 =====
  // ================================================================
}
