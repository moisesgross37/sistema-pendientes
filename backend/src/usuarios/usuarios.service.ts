import {
  Injectable,
  ConflictException,
  NotFoundException, // <-- Importante
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
// --- Nuevos Imports ---
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
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
      isActive: true, // <-- AÑADIDO: Asegura que el nuevo usuario esté activo
    });

    await this.usuariosRepository.save(nuevoUsuario);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...usuarioSinPassword } = nuevoUsuario;
    return usuarioSinPassword;
  }

  async findAll() {
    const usuarios = await this.usuariosRepository.find();

    // Ahora que la entidad tiene 'isActive', esto lo incluirá
    return usuarios.map((usuario) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...usuarioSinPassword } = usuario;
      return usuarioSinPassword;
    });
  }

  async findOneByUsername(username: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { username } });
  }

  // ================================================================
  // ===== 🚀 INICIO DE LAS NUEVAS FUNCIONES 🚀 =====
  // ================================================================

  async updateRol(id: number, updateRolDto: UpdateRolDto) {
    const { rol } = updateRolDto;

    // Buscamos el usuario
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Actualizamos el rol y guardamos
    usuario.rol = rol;
    await this.usuariosRepository.save(usuario);

    // Devolvemos el usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }

  async updateEstado(id: number, updateEstadoDto: UpdateEstadoDto) {
    const { isActive } = updateEstadoDto;

    // Buscamos el usuario
    const usuario = await this.usuariosRepository.findOne({ where: { id } });
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    // Actualizamos el estado y guardamos
    usuario.isActive = isActive;
    await this.usuariosRepository.save(usuario);

    // Devolvemos el usuario sin la contraseña
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...usuarioSinPassword } = usuario;
    return usuarioSinPassword;
  }
  
  // ================================================================
  // ===== 🚀 FIN DE LAS NUEVAS FUNCIONES 🚀 =====
  // ================================================================

  findOne(id: number) {
    // Este método sigue siendo un placeholder
    return `This action returns a #${id} usuario`;
  }
}
