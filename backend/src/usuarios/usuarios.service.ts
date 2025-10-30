import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Pendiente } from '../pendientes/entities/pendiente.entity'; // <--- 1. IMPORTAR PENDIENTE

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    // 👇 2. INYECTAR EL REPOSITORIO DE PENDIENTES
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
  ) {}

  async create(createUsuarioDto: CreateUsuarioDto) {
    const { username, password, nombreCompleto, rol } = createUsuarioDto;
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
    const usuarios = await this.usuariosRepository.find();
    return usuarios.map((usuario) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    });
  }

  async findOneByUsername(username: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { username } });
  }

  async updateRol(id: number, updateRolDto: UpdateRolDto) {
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

    if (usuario.rol === 'Administrador') {
      throw new ForbiddenException('No se puede eliminar a un usuario Administrador.');
    }

    // --- 👇 3. LÓGICA DE VALIDACIÓN AÑADIDA ---
    // Buscamos si el usuario es 'asesor' O 'colaboradorAsignado' de algún pendiente
    const dependencia = await this.pendientesRepository.findOne({
      where: [
        { asesor: { id: id } },
        { colaboradorAsignado: { id: id } }
      ]
    });
    
    if (dependencia) {
      // Si encontramos una dependencia, lanzamos un error 409 (Conflicto)
      throw new ConflictException(`No se puede eliminar a ${usuario.username} porque está asignado al pendiente #${dependencia.id}.`);
    }
    // --- 👆 FIN DE LA LÓGICA DE VALIDACIÓN ---

    // Si pasa la validación, procedemos a borrar
    const deleteResult = await this.usuariosRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return { message: 'Usuario eliminado con éxito.' };
  }
}
