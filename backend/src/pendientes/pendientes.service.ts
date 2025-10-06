import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class PendientesService {
  constructor(
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createPendienteDto: CreatePendienteDto): Promise<Pendiente> {
    const { asesorId, nombreCentro, descripcion, imagenes } = createPendienteDto; // <-- Obtenemos las imágenes del DTO

    const asesor = await this.usuariosRepository.findOneBy({ id: asesorId });
    if (!asesor) {
      throw new NotFoundException(`Asesor con ID "${asesorId}" no encontrado`);
    }

    const nuevoPendiente = this.pendientesRepository.create({
      nombreCentro,
      descripcion,
      asesor: asesor,
      imagenes: imagenes, // <-- AÑADIMOS LAS IMÁGENES AL OBJETO A GUARDAR
    });

    return this.pendientesRepository.save(nuevoPendiente);
  }

  async findAll() {
    return this.pendientesRepository.find();
  }

  findOne(id: number) {
    // Esta función aún es un placeholder, la construiremos si es necesario
    return this.pendientesRepository.findOne({ where: {id}, relations: ['asesor', 'colaboradorAsignado'] });
  }

  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    const { colaboradorAsignadoId, status } = updatePendienteDto;
    const pendiente = await this.pendientesRepository.findOneBy({ id });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }
    if (colaboradorAsignadoId) {
      const colaborador = await this.usuariosRepository.findOneBy({
        id: colaboradorAsignadoId,
      });
      if (!colaborador) {
        throw new NotFoundException(
          `Colaborador con ID "${colaboradorAsignadoId}" no encontrado`,
        );
      }
      pendiente.colaboradorAsignado = colaborador;
    }
    if (status) {
      pendiente.status = status;
    }
    return this.pendientesRepository.save(pendiente);
  }

  remove(id: number) {
    return `This action removes a #${id} pendiente`;
  }
}