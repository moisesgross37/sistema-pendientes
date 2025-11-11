// backend/src/estados-casos/estados-casos.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoCaso } from './entities/estado-caso.entity';
import { EstadosCasosService } from './estados-casos.service';
import { EstadosCasosController } from './estados-casos.controller';
import { Caso } from '../casos/entities/caso.entity'; // <--- 1. IMPORTAR CASO

@Module({
  imports: [
    TypeOrmModule.forFeature([EstadoCaso, Caso]), // <--- 2. AÑADIR CASO
  ],
  controllers: [EstadosCasosController],
  providers: [EstadosCasosService],
  exports: [EstadosCasosService],
})
export class EstadosCasosModule {}