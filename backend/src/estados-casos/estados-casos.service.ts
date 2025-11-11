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

  // --- ARRANQUE DEL MÓDULO (SIEMBRA) ---

  // Esta función se ejecuta automáticamente cuando el módulo arranca
  async onModuleInit() {
    await this.seedDefaultEstados();
  }

  // Esta es la lógica de "siembra"
  async seedDefaultEstados() {
    this.logger.log('Comprobando estados por defecto...');

    // Llama a la función 'findAll' que está definida más abajo
    const estados = await this.findAll();

    if (estados.length === 0) {
      // La tabla está vacía, vamos a crear los estados
      this.logger.warn(
        'Tabla de estados vacía. Creando estados por defecto...',
      );

      await this.create({
        nombre: 'Pendiente',
        color: '#888888', // Gris
        requiereComentario: false,
      });

      await this.create({
        nombre: 'En Proceso',
        color: '#007bff', // Azul
        requiereComentario: false,
      });

      await this.create({
        nombre: 'Resuelto',
        color: '#28a745', // Verde
        requiereComentario: false,
      });

      await this.create({
        nombre: 'Detenido',
        color: '#dc3545', // Rojo
        requiereComentario: true, // <-- ¡TU IDEA!
      });

      this.logger.log('Estados por defecto creados con éxito.');
    } else {
      this.logger.log('Los estados ya existen. No se necesita siembra.');
    }
  }

  // --- FUNCIONES CRUD (API) ---

  // --- CREAR UN NUEVO ESTADO ---
  async create(
    createEstadoCasoDto: CreateEstadoCasoDto,
  ): Promise<EstadoCaso> {
    const estadoExistente = await this.estadoCasoRepository.findOneBy({
      nombre: createEstadoCasoDto.nombre,
    });

    if (estadoExistente) {
      // (Esta comprobación es para el 'seed'. Si ya existen, no falla)
      if (createEstadoCasoDto.nombre === 'Pendiente' || createEstadoCasoDto.nombre === 'En Proceso' || createEstadoCasoDto.nombre === 'Resuelto' || createEstadoCasoDto.nombre === 'Detenido') {
        return estadoExistente;
      }
      throw new ConflictException(
        `Un estado con el nombre '${createEstadoCasoDto.nombre}' ya existe.`,
      );
    }
    const nuevoEstado = this.estadoCasoRepository.create(createEstadoCasoDto);
    return this.estadoCasoRepository.save(nuevoEstado);
  }

  // --- OBTENER TODOS LOS ESTADOS ---
  // (Esta es la función que faltaba)
  findAll(): Promise<EstadoCaso[]> {
    return this.estadoCasoRepository.find();
  }

  // --- OBTENER UN ESTADO POR ID ---
  async findOne(id: number): Promise<EstadoCaso> {
    const estado = await this.estadoCasoRepository.findOneBy({ id });
    if (!estado) {
      throw new NotFoundException(`Estado con ID ${id} no encontrado.`);
    }
    return estado;
  }

  // --- OBTENER UN ESTADO POR NOMBRE ---
  async findOneByNombre(nombre: string): Promise<EstadoCaso | null> {
    return this.estadoCasoRepository.findOneBy({ nombre });
  }

  // --- ACTUALIZAR UN ESTADO ---
  // --- ACTUALIZAR UN ESTADO (VERSIÓN CORREGIDA Y ROBUSTA) ---
  async update(
    id: number,
    updateEstadoCasoDto: UpdateEstadoCasoDto,
  ): Promise<EstadoCaso> {

    // 1. En lugar de 'preload', primero BUSCAMOS el estado
    const estado = await this.findOne(id); // Reutilizamos findOne (ya maneja NotFoundException)

    // 2. Aplicamos los cambios manualmente solo si existen en el DTO
    if (updateEstadoCasoDto.nombre !== undefined) {
      // (Verificamos duplicados si el nombre cambió)
      if (updateEstadoCasoDto.nombre !== estado.nombre) {
         const estadoExistente = await this.estadoCasoRepository.findOneBy({
          nombre: updateEstadoCasoDto.nombre,
        });
        if (estadoExistente) {
          throw new ConflictException(
            `Un estado con el nombre '${updateEstadoCasoDto.nombre}' ya existe.`,
          );
        }
      }
      estado.nombre = updateEstadoCasoDto.nombre;
    }

    if (updateEstadoCasoDto.color !== undefined) {
      estado.color = updateEstadoCasoDto.color;
    }

    if (updateEstadoCasoDto.requiereComentario !== undefined) {
      estado.requiereComentario = updateEstadoCasoDto.requiereComentario;
    }

    // 3. Guardamos la entidad 'estado' que ya modificamos
    return this.estadoCasoRepository.save(estado);
  }

  // --- ELIMINAR UN ESTADO ---
  async remove(id: number): Promise<{ message: string }> {
    const estado = await this.findOne(id);

    const dependencia = await this.casoRepository.findOne({
      where: { estado: { id: id } },
    });

    if (dependencia) {
      throw new ConflictException(
        `No se puede eliminar el estado '${estado.nombre}' porque está siendo usado por el Caso #${dependencia.id}.`,
      );
    }

    await this.estadoCasoRepository.remove(estado);
    return { message: `Estado '${estado.nombre}' (ID: ${id}) eliminado.` };
  }
}