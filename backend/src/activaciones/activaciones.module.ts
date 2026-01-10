import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivacionesService } from './activaciones.service';
import { ActivacionesController } from './activaciones.controller';
import { PendientesModule } from '../pendientes/pendientes.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { CentroEducativo } from '../marketing/entities/centro-educativo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { Caso } from '../casos/entities/caso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CentroEducativo, Usuario, Pendiente, Caso]), 
    PendientesModule, 
    UsuariosModule
  ],
  controllers: [ActivacionesController],
  providers: [ActivacionesService],
})
export class ActivacionesModule {}