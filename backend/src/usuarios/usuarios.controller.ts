// backend/src/usuarios/usuarios.controller.ts
// ARCHIVO CORREGIDO Y COMPLETO ✅

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
  UseGuards, // Dejo los imports aunque estén comentados abajo
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto'; // 👈 IMPORTANTE: Agregamos esto
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  // @UseGuards(JwtAuthGuard)
  create(@Request() req, @Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  // @UseGuards(JwtAuthGuard)
  findAll(@Request() req) {
    return this.usuariosService.findAll();
  }

  // 👇👇👇 ESTA ES LA RUTA QUE FALTABA (LA MAESTRA) 👇👇👇
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
  ) {
    // Esta función llama al método 'update' blindado que pusimos en el servicio
    return this.usuariosService.update(id, updateUsuarioDto);
  }
  // 👆👆👆 FIN DE LA RUTA NUEVA 👆👆👆

  @Patch(':id/rol')
  // @UseGuards(JwtAuthGuard)
  async updateRol(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRolDto: UpdateRolDto,
  ) {
    return this.usuariosService.updateRol(id, updateRolDto.rol);
  }

  @Patch(':id/estado')
  // @UseGuards(JwtAuthGuard)
  async updateEstado(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEstadoDto: UpdateEstadoDto,
  ) {
    return this.usuariosService.updateEstado(id, updateEstadoDto.isActive);
  }

  @Patch(':id/password')
  // @UseGuards(JwtAuthGuard)
  async resetPassword(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usuariosService.updatePassword(id, resetPasswordDto.password);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard)
  async remove(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usuariosService.remove(id);
  }
}