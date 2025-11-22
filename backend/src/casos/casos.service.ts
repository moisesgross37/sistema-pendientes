// backend/src/casos/casos.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caso } from './entities/caso.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { EstadosCasosService } from '../estados-casos/estados-casos.service';

@Injectable()
export class CasosService {
  constructor(
    @InjectRepository(Caso)
    private casoRepository: Repository<Caso>,
    @InjectRepository(Pendiente)
    private pendienteRepository: Repository<Pendiente>,
    private estadosCasosService: EstadosCasosService,
  ) {}

  // --- CREATE (Se queda igual, respetando tu lógica) ---
  async create(createCasoDto: CreateCasoDto): Promise<Caso> {
    const { pendienteId, descripcion } = createCasoDto;

    const pendiente = await this.pendienteRepository.findOneBy({ id: pendienteId });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID ${pendienteId} no encontrado.`);
    }

    const estadoPendiente = await this.estadosCasosService.findOneByNombre('Pendiente');
    if (!estadoPendiente) {
      throw new InternalServerErrorException(
        'El estado por defecto "Pendiente" no se encuentra en la base de datos.',
      );
    }

    const nuevoCaso = this.casoRepository.create({
      descripcion,
      pendiente,
      estado: estadoPendiente,
    });
    return this.casoRepository.save(nuevoCaso);
  }

  // --- FIND ONE (Se queda igual) ---
  async findOne(id: number): Promise<Caso> {
    const caso = await this.casoRepository.findOne({
      where: { id },
      relations: ['estado', 'pendiente'],
    });
    if (!caso) {
      throw new NotFoundException(`Caso con ID ${id} no encontrado.`);
    }
    return caso;
  }

  // --- ⭐ UPDATE ARREGLADO (AQUÍ ESTÁ LA SOLUCIÓN) ⭐ ---
  async update(id: number, updateCasoDto: UpdateCasoDto): Promise<Caso> {
    // Desestructuramos los datos que vienen del Controller
    // Nota: archivoUrl viene "inyectado" desde el controller si se subió foto
    const { estadoId, comentario, archivoUrl } = updateCasoDto as UpdateCasoDto & { archivoUrl?: string };

    // 1. Cargar el caso actual
    const caso = await this.findOne(id);

    // 2. Manejar cambio de Estado (Tu lógica original intacta)
    if (estadoId !== undefined) {
      const nuevoEstado = await this.estadosCasosService.findOne(estadoId);
      if (!nuevoEstado) {
        throw new NotFoundException(`EstadoCaso con ID ${estadoId} no encontrado.`);
      }
      caso.estado = nuevoEstado;
    }

    // 3. Manejar cambio de Comentario
    if (comentario !== undefined) {
      caso.comentario = comentario;
    }

    // 4. ⭐ Manejar cambio de Foto (LO NUEVO) ⭐
    // Si el controller nos mandó una URL nueva, la guardamos en la base de datos
    if (archivoUrl) {
      caso.archivoUrl = archivoUrl;
    }

    // 5. Guardar cambios
    return this.casoRepository.save(caso);
  }

  // --- REMOVE (Se queda igual) ---
  async remove(id: number): Promise<{ message: string }> {
    const caso = await this.findOne(id);
    await this.casoRepository.remove(caso);
    return { message: `Caso #${id} eliminado.` };
  }
}