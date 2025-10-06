import { Test, TestingModule } from '@nestjs/testing';
import { PendientesService } from './pendientes.service';

describe('PendientesService', () => {
  let service: PendientesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PendientesService],
    }).compile();

    service = module.get<PendientesService>(PendientesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
