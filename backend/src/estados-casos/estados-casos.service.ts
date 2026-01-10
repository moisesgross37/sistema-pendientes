// backend/src/estados-casos/estados-casos.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoCaso } from './entities/estado-caso.entity';
import { CreateEstadoCasoDto } from './dto/create-estado-caso.dto';
import { UpdateEstadoCasoDto } from './dto/update-estado-caso.dto';
import { Caso } from '../casos/entities/caso.entity';

@Injectable()
export class EstadosCasosService implements OnModuleInit {
  private readonly logger = new Logger(EstadosCasosService.name);

  constructor(
    @InjectRepository(EstadoCaso)
    private estadoCasoRepository: Repository<EstadoCaso>,
    @InjectRepository(Caso)
    private casoRepository: Repository<Caso>,
  ) {}

  // =================================================================
  // 🌱 SIEMBRA AUTOMÁTICA (Valores por defecto al iniciar)
  // =================================================================
  async onModuleInit() {
    const cantidad = await this.estadoCasoRepository.count();
    
    if (cantidad === 0) {
      this.logger.log('Sembrando estados por defecto...');
      
      const estadosIniciales = [
        { nombre: 'Pendiente',  color: '#ffc107', requiereComentario: false }, // Warning (Amarillo)
        { nombre: 'En Proceso', color: '#0d6efd', requiereComentario: false }, // Primary (Azul)
        { nombre: 'Completado', color: '#198754', requiereComentario: false }, // Success (Verde) - CORREGIDO
        { nombre: 'Detenido',   color: '#dc3545', requiereComentario: true  }, // Danger (Rojo)
      ];

      for (const estado of estadosIniciales) {
        await this.estadoCasoRepository.save(this.estadoCasoRepository.create(estado));
      }
      this.logger.log('Estados creados con éxito.');
    }
  }

  // =================================================================
  // 🛠️ CRUD PRINCIPAL
  // =================================================================

  async create(createEstadoCasoDto: CreateEstadoCasoDto): Promise<EstadoCaso> {
    const existe = await this.findOneByNombre(createEstadoCasoDto.nombre);
    if (existe) {
      throw new ConflictException(`El estado '${createEstadoCasoDto.nombre}' ya existe.`);
    }
    const nuevo = this.estadoCasoRepository.create(createEstadoCasoDto);
    return this.estadoCasoRepository.save(nuevo);
  }

  findAll(): Promise<EstadoCaso[]> {
    return this.estadoCasoRepository.find({ order: { id: 'ASC' } });
  }

  async findOne(id: number): Promise<EstadoCaso> {
    const estado = await this.estadoCasoRepository.findOneBy({ id });
    if (!estado) throw new NotFoundException(`Estado #${id} no encontrado.`);
    return estado;
  }

  async findOneByNombre(nombre: string): Promise<EstadoCaso | null> {
    return this.estadoCasoRepository.findOneBy({ nombre });
  }

  async update(id: number, dto: UpdateEstadoCasoDto): Promise<EstadoCaso> {
    const estado = await this.findOne(id);

    // Si cambia el nombre, verificamos que no duplique a otro existente
    if (dto.nombre && dto.nombre !== estado.nombre) {
      const existe = await this.findOneByNombre(dto.nombre);
      if (existe) throw new ConflictException(`El nombre '${dto.nombre}' ya está en uso.`);
      estado.nombre = dto.nombre;
    }

    if (dto.color) estado.color = dto.color;
    if (dto.requiereComentario !== undefined) estado.requiereComentario = dto.requiereComentario;

    return this.estadoCasoRepository.save(estado);
  }

  async remove(id: number): Promise<{ message: string }> {
    const estado = await this.findOne(id);

    // Protección: No borrar si hay casos usándolo
    const uso = await this.casoRepository.findOne({ where: { estado: { id } } });
    if (uso) {
      throw new ConflictException(`No puedes borrar '${estado.nombre}' porque hay casos usándolo.`);
    }

    await this.estadoCasoRepository.remove(estado);
    return { message: `Estado '${estado.nombre}' eliminado correctamente.` };
  }
}