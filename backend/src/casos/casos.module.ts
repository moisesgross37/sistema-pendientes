import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CasosService } from './casos.service';
import { CasosController } from './casos.controller';

// 👇 1. IMPORTAMOS LAS ENTIDADES NECESARIAS
import { Caso } from './entities/caso.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { EstadoCaso } from '../estados-casos/entities/estado-caso.entity'; // <--- NUEVO
import { Usuario } from '../usuarios/entities/usuario.entity';         // <--- NUEVO

@Module({
  controllers: [CasosController],
  providers: [CasosService],
  imports: [
    // 👇 2. DAMOS PERMISO A LOS REPOSITORIOS AQUÍ
    TypeOrmModule.forFeature([
      Caso, 
      Pendiente, 
      EstadoCaso, // <--- Agregado para arreglar el error
      Usuario     // <--- Agregado para arreglar el error
    ]),
  ],
  exports: [CasosService],
})
export class CasosModule {}