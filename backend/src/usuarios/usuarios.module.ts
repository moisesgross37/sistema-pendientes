// backend/src/usuarios/usuarios.module.ts

import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity'; // <--- 1. IMPORTAR PENDIENTE

@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
  // 👇 2. AÑADIR 'Pendiente' AL forFeature
  imports: [TypeOrmModule.forFeature([Usuario, Pendiente])],
  exports: [UsuariosService],
})
export class UsuariosModule {}
