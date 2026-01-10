import { Module } from '@nestjs/common';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingCliente } from './entities/marketing-cliente.entity';
import { CentroEducativo } from './entities/centro-educativo.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
// 👇 1. IMPORTAR CASO
import { Caso } from '../casos/entities/caso.entity'; 
import { EstadosCasosModule } from '../estados-casos/estados-casos.module'; // Importante para el estado inicial

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarketingCliente, 
      CentroEducativo, 
      Pendiente, 
      Usuario,
      Caso // 👈 2. AGREGAR AQUÍ
    ]),
    EstadosCasosModule // Necesario para buscar el estado "Pendiente"
  ],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}