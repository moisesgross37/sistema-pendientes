// backend/src/casos/casos.service.ts
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException, // Importado por seguridad
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caso } from './entities/caso.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { EstadosCasosService } from '../estados-casos/estados-casos.service'; // <--- 1. IMPORTAR SERVICIO DE ESTADOS

@Injectable()
export class CasosService {
  constructor(
    @InjectRepository(Caso)
    private casoRepository: Repository<Caso>,
    @InjectRepository(Pendiente)
    private pendienteRepository: Repository<Pendiente>,
    // --- 👇 2. INYECTAR EL SERVICIO DE ESTADOS ---
    private estadosCasosService: EstadosCasosService,
  ) {}

  // --- 👇 3. FUNCIÓN 'CREATE' ARREGLADA ---
  // (Esta se usa si creamos un caso 'suelto', no desde el modal de Pendientes)
  async create(createCasoDto: CreateCasoDto): Promise<Caso> {
    const { pendienteId, descripcion } = createCasoDto;

    const pendiente = await this.pendienteRepository.findOneBy({ id: pendienteId });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID ${pendienteId} no encontrado.`);
    }

    // Buscar el estado por defecto "Pendiente"
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
      // (imagenes se añadiría en otro paso si usamos esta ruta)
    });
    return this.casoRepository.save(nuevoCaso);
  }

  // --- (findOne se queda igual) ---
  async findOne(id: number): Promise<Caso> {
    const caso = await this.casoRepository.findOne({
      where: { id },
      relations: ['estado', 'pendiente'], // Cargar las relaciones
    });
    if (!caso) {
      throw new NotFoundException(`Caso con ID ${id} no encontrado.`);
    }
    return caso;
  }

  // --- 👇 4. FUNCIÓN 'UPDATE' (DEL MODAL) ARREGLADA ---
  async update(id: number, updateCasoDto: UpdateCasoDto): Promise<Caso> {
    const { estadoId, comentario } = updateCasoDto;

    // 1. Cargar el caso que queremos modificar
    const caso = await this.findOne(id); // Reutilizamos findOne

    // 2. Manejar el cambio de Estado (si se envió un estadoId)
    if (estadoId !== undefined) {
      // Si nos pasaron un estadoId, lo buscamos
      const nuevoEstado = await this.estadosCasosService.findOne(estadoId);
      if (!nuevoEstado) {
        throw new NotFoundException(`EstadoCaso con ID ${estadoId} no encontrado.`);
      }
      caso.estado = nuevoEstado; // Asignamos el objeto
    }

    // 3. Manejar el cambio de Comentario (si se envió un comentario)
    if (comentario !== undefined) {
      caso.comentario = comentario;
    }

    // 4. Guardar y devolver el caso actualizado
    return this.casoRepository.save(caso);
  }

  // --- (remove se queda igual por ahora) ---
  async remove(id: number): Promise<{ message: string }> {
    const caso = await this.findOne(id);
    await this.casoRepository.remove(caso);
    return { message: `Caso #${id} eliminado.` };
  }
}