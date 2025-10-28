import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  Patch, 
  Param, 
  ParseIntPipe, 
  Delete, // <-- Nuevo Import
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
// --- Nuevo Import ---
import { ResetPasswordDto } from './dto/reset-password.dto';


@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() createUsuarioDto: CreateUsuarioDto) {
    // ... (tu código de create sigue igual) ...
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden crear usuarios.');
    }
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    // ... (tu código de findAll sigue igual) ...
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden ver la lista de usuarios.');
    }
    return this.usuariosService.findAll();
  }

  @Patch(':id/rol')
  @UseGuards(JwtAuthGuard)
  async updateRol(
    // ... (tu código de updateRol sigue igual) ...
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
    // ... (tu código de updateEstado sigue igual) ...
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
  // ===== 🚀 INICIO DE LAS NUEVAS RUTAS 🚀 =====
  // ================================================================

  @Patch(':id/password')
  @UseGuards(JwtAuthGuard)
  async resetPassword(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden cambiar contraseñas.');
    }
    
    // Chequeo de seguridad: Un admin no puede cambiarse la clave a sí mismo aquí
    // (Debería tener su propio panel de "cambiar mi clave")
    if (req.user.userId === id) {
        throw new ForbiddenException('No puedes cambiar tu propia contraseña desde este panel.');
    }
    
    return this.usuariosService.resetPassword(id, resetPasswordDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    if (req.user.rol !== 'Administrador') {
      throw new ForbiddenException('Solo los administradores pueden eliminar usuarios.');
    }

    // Chequeo de seguridad: No puedes eliminarte a ti mismo.
    if (req.user.userId === id) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    }
    
    return this.usuariosService.remove(id);
  }
}
