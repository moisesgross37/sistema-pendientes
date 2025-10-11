import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as fs from 'fs/promises'; // Importamos el módulo de archivos de Node.js
import { join } from 'path'; // Importamos 'join' para construir rutas

@Injectable()
export class PendientesService {
  constructor(
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
  ) {}

  async create(createPendienteDto: CreatePendienteDto): Promise<Pendiente> {
    const { asesorId, nombreCentro, descripcion, imagenes } = createPendienteDto;
    const asesor = await this.usuariosRepository.findOneBy({ id: asesorId });
    if (!asesor) {
      throw new NotFoundException(`Asesor con ID "${asesorId}" no encontrado`);
    }
    const nuevoPendiente = this.pendientesRepository.create({
      nombreCentro,
      descripcion,
      asesor: asesor,
      imagenes: imagenes,
    });
    return this.pendientesRepository.save(nuevoPendiente);
  }

  async findAll() {
    return this.pendientesRepository.find({
      relations: ['asesor', 'colaboradorAsignado'],
      order: { id: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.pendientesRepository.findOne({ where: {id}, relations: ['asesor', 'colaboradorAsignado'] });
  }

  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    const { colaboradorAsignadoId, status } = updatePendienteDto;
    const pendiente = await this.pendientesRepository.findOneBy({ id });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }

    // Lógica para fecha de asignación
    if (colaboradorAsignadoId && !pendiente.colaboradorAsignado) {
      pendiente.fechaAsignacion = new Date(); // Se asigna por primera vez
      const colaborador = await this.usuariosRepository.findOneBy({ id: colaboradorAsignadoId });
      if (!colaborador) {
        throw new NotFoundException(`Colaborador con ID "${colaboradorAsignadoId}" no encontrado`);
      }
      pendiente.colaboradorAsignado = colaborador;
    }

    // Lógica para fecha de conclusión
    if (status && status === 'Concluido' && pendiente.status !== 'Concluido') {
      pendiente.fechaConclusion = new Date(); // Se marca como concluido
    }
    
    if (status) {
      pendiente.status = status;
    }

    return this.pendientesRepository.save(pendiente);
  }

  // --- NUEVA FUNCIÓN PARA ELIMINAR ---
  async remove(id: number): Promise<{ message: string }> {
    const pendiente = await this.pendientesRepository.findOneBy({ id });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }

    // Si hay imágenes, las borramos del disco
    if (pendiente.imagenes && pendiente.imagenes.length > 0) {
      for (const imageName of pendiente.imagenes) {
        try {
          const imagePath = join('/opt/render/project/src/uploads', imageName);
          await fs.unlink(imagePath);
        } catch (error) {
          console.error(`No se pudo eliminar el archivo ${imageName}:`, error);
          // Continuamos incluso si falla el borrado de un archivo
        }
      }
    }

    await this.pendientesRepository.remove(pendiente);
    return { message: `Pendiente con ID #${id} eliminado correctamente.` };
  }
}
