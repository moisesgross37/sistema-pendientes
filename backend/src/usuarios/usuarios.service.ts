import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  // =================================================================
  // 1. CREAR USUARIO (Con conversión de Deptos)
  // =================================================================
  async create(createUsuarioDto: CreateUsuarioDto) {
    const { username, password, nombreCompleto, rol, departamentos } = createUsuarioDto;

    // Verificar duplicados
    const existe = await this.usuariosRepository.findOne({ where: { username } });
    if (existe) {
      throw new BadRequestException('El nombre de usuario ya está en uso.');
    }

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Conversión de números a Strings para simple-array
    const deptosString = departamentos ? departamentos.map(d => String(d)) : [];

    const nuevoUsuario = this.usuariosRepository.create({
      username,
      password: hash, 
      nombreCompleto,
      rol: rol || 'Asesor',
      departamentos: deptosString,
      isActive: true,
    });

    const guardado = await this.usuariosRepository.save(nuevoUsuario);
    
    const { password: _, ...result } = guardado;
    return result;
  }

  // =================================================================
  // 2. MÉTODOS DE BÚSQUEDA
  // =================================================================
  findAll() {
    return this.usuariosRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);
    const { password, ...result } = usuario;
    return result;
  }

  async findOneByUsername(username: string) {
    return this.usuariosRepository.findOne({ where: { username } });
  }

  // =================================================================
  // 3. ACTUALIZAR (MAIN)
  // =================================================================
  async update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException(`Usuario #${id} no encontrado`);

    if (updateUsuarioDto.password) {
      const salt = await bcrypt.genSalt(10);
      usuario.password = await bcrypt.hash(updateUsuarioDto.password, salt);
    }

    if (updateUsuarioDto.nombreCompleto) usuario.nombreCompleto = updateUsuarioDto.nombreCompleto;
    if (updateUsuarioDto.rol) usuario.rol = updateUsuarioDto.rol;
    if (updateUsuarioDto.isActive !== undefined) usuario.isActive = updateUsuarioDto.isActive;
    
    if (updateUsuarioDto.departamentos) {
        usuario.departamentos = updateUsuarioDto.departamentos.map(d => String(d));
    }

    try {
      return await this.usuariosRepository.save(usuario);
    } catch (error) {
      throw new BadRequestException('Error al actualizar el usuario: ' + error.message);
    }
  }

  // =================================================================
  // 4. MÉTODOS ESPECÍFICOS
  // =================================================================
  
  async updateRol(id: number, rol: string) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    usuario.rol = rol;
    return this.usuariosRepository.save(usuario);
  }

  async updateEstado(id: number, isActive: boolean) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    usuario.isActive = isActive;
    return this.usuariosRepository.save(usuario);
  }

  async updatePassword(id: number, newPass: string) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    
    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(newPass, salt);
    
    return this.usuariosRepository.save(usuario);
  }

  async remove(id: number) {
    const usuario = await this.usuariosRepository.findOneBy({ id });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return this.usuariosRepository.remove(usuario);
  }

  // =================================================================
  // 6. BUSCADOR DE ESPECIALISTAS (VERSIÓN BLINDADA) 🕵️‍♂️
  // =================================================================
  async findOneByDepto(depto: string) {
    const usuarios = await this.usuariosRepository.find({ where: { isActive: true } });
    
    // Buscamos ignorando mayúsculas/minúsculas y tipos de datos
    return usuarios.find(u => {
        if (!u.departamentos) return false;
        
        // Convertimos todo a texto para buscar sin errores
        const deptosString = JSON.stringify(u.departamentos).toLowerCase();
        const busqueda = depto.toLowerCase();

        return deptosString.includes(busqueda);
    });
  }

}