import { Module } from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { PendientesController } from './pendientes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pendiente, Usuario])], // Le damos acceso a ambas entidades
  controllers: [PendientesController],
  providers: [PendientesService],
})
export class PendientesModule {}