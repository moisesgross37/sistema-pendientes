import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Caso } from './entities/caso.entity';
import { CreateCasoDto } from './dto/create-caso.dto';
import { UpdateCasoDto } from './dto/update-caso.dto';
import { EstadoCaso } from '../estados-casos/entities/estado-caso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Injectable()
export class CasosService {
  constructor(
    @InjectRepository(Caso)
    private readonly casosRepository: Repository<Caso>,
    @InjectRepository(EstadoCaso)
    private readonly estadosRepository: Repository<EstadoCaso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createCasoDto: CreateCasoDto) {
    const nuevoCaso = this.casosRepository.create(createCasoDto);
    // Usamos 'any' temporal para asegurar compatibilidad al crear
    if ((createCasoDto as any).estadoId) {
      nuevoCaso.estado = { id: (createCasoDto as any).estadoId } as EstadoCaso;
    }
    return this.casosRepository.save(nuevoCaso);
  }

  async findAll() {
    return this.casosRepository.find({
      relations: ['estado', 'responsable'],
      order: { id: 'DESC' },
    });
  }

  async findOne(id: number) {
    const caso = await this.casosRepository.findOne({
      where: { id },
      relations: ['estado', 'responsable'],
    });
    if (!caso) throw new NotFoundException(`Caso #${id} no encontrado`);
    return caso;
  }

  // 👇👇👇 AQUÍ ESTÁ LA LÓGICA DEL RELOJ Y EL PASE DE BOLA 👇👇👇
  async update(id: number, updateCasoDto: UpdateCasoDto) {
    const caso = await this.findOne(id);

    // 1. LÓGICA DE ESTADOS Y RELOJ ⏱️
    if (updateCasoDto.estadoId) {
      const nuevoEstadoId = Number(updateCasoDto.estadoId);
      
      // A. Si pasa a "EN PROCESO" (ID 2) y no tenía fecha de inicio...
      // ¡ARRANCA EL RELOJ!
      if (nuevoEstadoId === 2 && !caso.fecha_inicio) {
           caso.fecha_inicio = new Date(); 
      }

      // B. Si pasa a "COMPLETADO" (ID 3)... ¡PARA EL RELOJ!
      if (nuevoEstadoId === 3) {
        caso.fecha_fin = new Date();
      }

      caso.estado = { id: nuevoEstadoId } as EstadoCaso;
    }

    // 2. LÓGICA DE CAMBIO DE RESPONSABLE (RELEVOS) 👤
    if (updateCasoDto.responsableId) {
      caso.responsable = { id: Number(updateCasoDto.responsableId) } as Usuario;
    }

    // 3. ACTUALIZAR OTROS CAMPOS (Ahora sí existen en el DTO)
    if (updateCasoDto.descripcion) caso.descripcion = updateCasoDto.descripcion;
    if (updateCasoDto.tipo_servicio) caso.tipo_servicio = updateCasoDto.tipo_servicio;
    if (updateCasoDto.archivoUrl) caso.archivoUrl = updateCasoDto.archivoUrl;
    if (updateCasoDto.comentario) caso.comentario = updateCasoDto.comentario;
    
    if (updateCasoDto.imagenes) {
       caso.imagenes = updateCasoDto.imagenes;
    }

    return this.casosRepository.save(caso);
  }

  async remove(id: number) {
    const caso = await this.findOne(id);
    return this.casosRepository.remove(caso);
  }
}