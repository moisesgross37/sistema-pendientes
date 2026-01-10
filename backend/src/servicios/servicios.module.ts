import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiciosService } from './servicios.service';
import { ServiciosController } from './servicios.controller';
import { Servicio } from './servicio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    // Damos permiso para usar las tablas de Servicios y Usuarios
    TypeOrmModule.forFeature([Servicio, Usuario]) 
  ],
  controllers: [ServiciosController],
  providers: [ServiciosService],
})
export class ServiciosModule {}