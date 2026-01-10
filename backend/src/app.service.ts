import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from './usuarios/entities/usuario.entity'; 
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
  ) {}

  getHello(): string {
    return 'Sistema Pendientes Operativo 🚀';
  }

  // 👇 ESTO SE EJECUTA AUTOMÁTICAMENTE AL ENCENDER EL SISTEMA
  async onApplicationBootstrap() {
    this.logger.log('🧐 Verificando si existen usuarios...');
    
    // Verificamos si la tabla de usuarios está vacía
    const count = await this.usuarioRepo.count();

    if (count === 0) {
      this.logger.warn('🚨 Base de Datos vacía. Creando Usuario Maestro...');
      
      // CREAMOS AL PRIMER ADMIN
      const admin = this.usuarioRepo.create({
        nombreCompleto: 'Moises Admin',
        username: 'admin',
        password: await bcrypt.hash('123456', 10), // 🔑 CLAVE: 123456
        rol: 'Administrador',
        isActive: true,
        departamentos: ['Gerencia'] 
      });

      await this.usuarioRepo.save(admin);
      this.logger.log('✅ Usuario Maestro creado: user: admin / pass: 123456');
    } else {
      this.logger.log('✅ Usuarios detectados. No es necesario crear el Admin.');
    }
  }
}