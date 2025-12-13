import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { MarketingCliente } from './entities/marketing-cliente.entity';
// 👇 1. IMPORTAR LA NUEVA ENTIDAD
import { CentroEducativo } from './entities/centro-educativo.entity';

@Module({
  // 👇 2. AGREGARLA AQUÍ EN EL ARRAY
  imports: [TypeOrmModule.forFeature([MarketingCliente, CentroEducativo])],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}