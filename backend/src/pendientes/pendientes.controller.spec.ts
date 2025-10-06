import { Test, TestingModule } from '@nestjs/testing';
import { PendientesController } from './pendientes.controller';
import { PendientesService } from './pendientes.service';

describe('PendientesController', () => {
  let controller: PendientesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PendientesController],
      providers: [PendientesService],
    }).compile();

    controller = module.get<PendientesController>(PendientesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
