// backend/src/usuarios/usuarios.controller.ts
// ARCHIVO COMPLETO Y CORREGIDO (Comentando los UseGuards)

import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards, // <-- Importación (la dejamos)
  Request,
  ForbiddenException,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // <--- 1. COMENTADO
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  // @UseGuards(JwtAuthGuard) // <--- 2. COMENTADO
  create(@Request() req, @Body() createUsuarioDto: CreateUsuarioDto) {
    // (Tu lógica de 'req.user.rol' puede fallar si el guardián no se usa.
    // Lo probaremos. Si falla, quitaremos el '@Request() req' 
    // y la validación de rol temporalmente.)
    
    // if (req.user.rol !== 'Administrador') {
    //   throw new ForbiddenException('Solo los administradores pueden crear usuarios.');
    // }
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  // @UseGuards(JwtAuthGuard) // <--- 3. COMENTADO
  findAll(@Request() req) {
    // 👇 CORRECCIÓN: Permitimos que Administradores Y Colaboradores vean la lista
    // if (req.user.rol !== 'Administrador' && req.user.rol !== 'Colaborador') {
    //   throw new ForbiddenException('No tienes permiso para ver la lista de usuarios.');
    // }
    return this.usuariosService.findAll();
  }

  @Patch(':id/rol')
  // @UseGuards(JwtAuthGuard) // <--- 4. COMENTADO
  async updateRol(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
  ) {
    // if (req.user.rol !== 'Administrador') {
    //   throw new ForbiddenException('Solo los administradores pueden cambiar roles.');
    // }
    return this.usuariosService.updateRol(id, updateRolDto);
  }

  @Patch(':id/estado')
  // @UseGuards(JwtAuthGuard) // <--- 5. COMENTADO
  async updateEstado(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoDto,
  ) {
    // if (req.user.rol !== 'Administrador') {
    //   throw new ForbiddenException('Solo los administradores pueden cambiar el estado.');
    // }
    return this.usuariosService.updateEstado(id, updateEstadoDto);
  }

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS RUTAS 🚀 =====
  // ================================================================

  @Patch(':id/password')
  // @UseGuards(JwtAuthGuard) // <--- 6. COMENTADO
  async resetPassword(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    // if (req.user.rol !== 'Administrador') {
    //   throw new ForbiddenException('Solo los administradores pueden cambiar contraseñas.');
    // }
    
    // if (req.user.userId === id) {
    //     throw new ForbiddenException('No puedes cambiar tu propia contraseña desde este panel.');
    // }
    
    return this.usuariosService.resetPassword(id, resetPasswordDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // <--- 7. COMENTADO
  async remove(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    // if (req.user.rol !== 'Administrador') {
    //   throw new ForbiddenException('Solo los administradores pueden eliminar usuarios.');
    // }

    // if (req.user.userId === id) {
    //   throw new ForbiddenException('No puedes eliminar tu propia cuenta.');
    // }
    
    return this.usuariosService.remove(id);
  }
}