import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException, // <-- Importante
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
// --- Nuevo Import ---
import { ResetPasswordDto } from './dto/reset-password.dto';


@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { username, password, nombreCompleto, rol } = createUsuarioDto;
    // ... (tu código de create sigue igual) ...
    const usuarioExistente = await this.usuariosRepository.findOne({
      where: { username },
    });
    if (usuarioExistente) {
      throw new ConflictException('El nombre de usuario ya existe');
    }
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);
    const nuevoUsuario = this.usuariosRepository.create({
      username,
      password: hashedPassword,
      nombreCompleto,
      rol,
      isActive: true, 
    });
    await this.usuariosRepository.save(nuevoUsuario);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...usuarioSinPassword } = nuevoUsuario;
    return usuarioSinPassword;
  }

  async findAll() {
    // ... (tu código de findAll sigue igual) ...
    const usuarios = await this.usuariosRepository.find();
    return usuarios.map((usuario) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    });
  }

  async findOneByUsername(username: string): Promise<Usuario | null> {
    // ... (tu código de findOneByUsername sigue igual) ...
    return this.usuariosRepository.findOne({ where: { username } });
  }

  async updateRol(id: number, updateRolDto: UpdateRolDto) {
    // ... (tu código de updateRol sigue igual) ...
    const { rol } = updateRolDto;
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    usuario.rol = rol;
    await this.usuariosRepository.save(usuario);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoDto) {
    // ... (tu código de updateEstado sigue igual) ...
    const { isActive } = updateEstadoDto;
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    usuario.isActive = isActive;
    await this.usuariosRepository.save(usuario);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS FUNCIONES 🚀 =====
  // ================================================================

  async resetPassword(id: number, resetPasswordDto: ResetPasswordDto) {
    const { password } = resetPasswordDto;
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Hashear la nueva contraseña
    const salt = await bcrypt.genSalt();
    usuario.password = await bcrypt.hash(password, salt);
    
    await this.usuariosRepository.save(usuario);
    return { message: 'Contraseña actualizada con éxito.' };
  }

  async remove(id: number) {
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Doble chequeo de seguridad: No permitir borrar Administradores
    // (Puedes quitar esto si quieres poder borrar otros admins)
    if (usuario.rol === 'Administrador') {
      throw new ForbiddenException('No se puede eliminar a un usuario Administrador.');
    }

    const deleteResult = await this.usuariosRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return { message: 'Usuario eliminado con éxito.' };
  }
}
