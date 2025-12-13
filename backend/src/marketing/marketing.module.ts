import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { MarketingCliente } from './entities/marketing-cliente.entity';
import { CentroEducativo } from './entities/centro-educativo.entity';
// 👇 1. IMPORTAR LA ENTIDAD PENDIENTE
import { Pendiente } from '../pendientes/entities/pendiente.entity';

@Module({
  // 👇 2. AGREGARLA AQUÍ AL ARRAY
  imports: [TypeOrmModule.forFeature([MarketingCliente, CentroEducativo, Pendiente])],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}