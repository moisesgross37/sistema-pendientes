// backend/src/casos/casos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Caso } from './entities/caso.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { CasosService } from './casos.service';
import { CasosController } from './casos.controller';
import { EstadosCasosModule } from '../estados-casos/estados-casos.module'; // <--- 1. IMPORTAR MÓDULO

@Module({
  controllers: [CasosController],
  providers: [CasosService],
  imports: [
    TypeOrmModule.forFeature([Caso, Pendiente]),
    EstadosCasosModule, // <--- 2. AÑADIR A IMPORTS
  ],
  exports: [CasosService],
})
export class CasosModule {}