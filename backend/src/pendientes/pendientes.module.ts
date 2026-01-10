import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PendientesService } from './pendientes.service';
import { PendientesController } from './pendientes.controller';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CentroEducativo } from '../marketing/entities/centro-educativo.entity';
import { Caso } from '../casos/entities/caso.entity'; // 👈 IMPORTAR

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Pendiente, 
      Usuario, 
      CentroEducativo,
      Caso // 👈 AGREGAR AQUÍ
    ])
  ],
  controllers: [PendientesController],
  providers: [PendientesService],
  exports: [PendientesService],
})
export class PendientesModule {}