import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketingService } from './marketing.service';
import { MarketingController } from './marketing.controller';
import { MarketingCliente } from './entities/marketing-cliente.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MarketingCliente])],
  controllers: [MarketingController],
  providers: [MarketingService],
})
export class MarketingModule {}