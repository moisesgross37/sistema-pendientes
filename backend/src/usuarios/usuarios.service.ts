import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  OnModuleInit, // <--- 1. IMPORTAR HOOK
  Logger, // <--- 2. IMPORTAR LOGGER
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';
import { UpdateRolDto } from './dto/update-rol.dto';
import { UpdateEstadoDto } from './dto/update-estado.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Pendiente } from '../pendientes/entities/pendiente.entity';

@Injectable()
export class UsuariosService implements OnModuleInit { // <--- 3. IMPLEMENTAR HOOK
  
  // --- 👇 4. AÑADIR UN LOGGER ---
  private readonly logger = new Logger(UsuariosService.name);
  // --- 👆 ---

  constructor(
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
  ) {}

  // --- 👇 5. AÑADIR ESTA FUNCIÓN ---
  // Esta función se ejecuta automáticamente cuando el módulo arranca
  async onModuleInit() {
    await this.seedDefaultAdmin();
  }

  // --- 👇 6. AÑADIR ESTA FUNCIÓN ---
  // Esta es la lógica de "siembra" del Admin
  async seedDefaultAdmin() {
    this.logger.log('Comprobando usuarios por defecto...');
    
    const count = await this.usuariosRepository.count();
    
    if (count === 0) {
      // La tabla está vacía, vamos a crear el Admin
      this.logger.warn('Tabla de usuarios vacía. Creando usuario "admin" por defecto...');
      
      await this.create({ 
        nombreCompleto: 'Administrador del Sistema', 
        username: 'admin',
        password: 'admin123', // <-- Contraseña temporal
        rol: 'Administrador'
      });
      
      this.logger.log('Usuario "admin" (clave: "admin123") creado con éxito.');
    } else {
      this.logger.log('Los usuarios ya existen. No se necesita siembra.');
    }
  }

  // --- (El resto de tus funciones: create, findAll, etc...) ---

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const { username, password, nombreCompleto, rol } = createUsuarioDto;
    
    // (Modificamos el 'ConflictException' para que el 'seed' no falle)
    const usuarioExistente = await this.usuariosRepository.findOne({
      where: { username },
    });
    if (usuarioExistente) {
      // Si el 'seeder' intenta crear 'admin' y ya existe, no es un error.
      if (username === 'admin') {
        this.logger.log('El usuario "admin" ya existe.');
        return usuarioExistente;
      }
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
    return nuevoUsuario; // <--- LÍNEA CORREGIDA
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
    const dependencia = await this.pendientesRepository.findOne({
      where: [{ asesor: { id: id } }, { colaboradorAsignado: { id: id } }],
    });
    if (dependencia) {
      throw new ConflictException(
        `No se puede eliminar a ${usuario.username} porque está asignado al pendiente #${dependencia.id}.`,
      );
    }
    const deleteResult = await this.usuariosRepository.delete(id);
    if (deleteResult.affected === 0) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }
    return { message: 'Usuario eliminado con éxito.' };
  }
}