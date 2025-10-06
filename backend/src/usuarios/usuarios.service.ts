import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import * as bcrypt from 'bcrypt';

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

  // 👇 MÉTODO NUEVO AÑADIDO AQUÍ 👇
  async findOneByUsername(username: string): Promise<Usuario | null> {
    return this.usuariosRepository.findOne({ where: { username } });
  }

  findOne(id: number) {
    return `This action returns a #${id} usuario`;
  }
}