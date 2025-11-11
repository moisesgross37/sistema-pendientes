import { Module } from '@nestjs/common';
import { PendientesService } from './pendientes.service';
import { PendientesController } from './pendientes.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pendiente } from './entities/pendiente.entity';
import { Caso } from '../casos/entities/caso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { EstadosCasosModule } from '../estados-casos/estados-casos.module'; // <--- 1. IMPORTAR

@Module({
  controllers: [PendientesController],
  providers: [PendientesService],
  imports: [
    TypeOrmModule.forFeature([Pendiente, Caso, Usuario]),
    EstadosCasosModule, // <--- 2. AÑADIR A IMPORTS
  ],
})
export class PendientesModule {}