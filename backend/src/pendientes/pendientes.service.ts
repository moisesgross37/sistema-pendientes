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

// backend/src/pendientes/pendientes.service.ts

  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    const { colaboradorAsignadoId, status } = updatePendienteDto;
    const pendiente = await this.pendientesRepository.findOneBy({ id });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }

    // --- 👇 INICIO DE LA LÓGICA CORREGIDA ---
    
    // El DTO nos puede enviar 3 valores:
    // 1. undefined: (No se tocó el campo en el formulario)
    // 2. null: (Se seleccionó "-- Sin Asignar --")
    // 3. number: (Se seleccionó un colaborador)
    
    if (colaboradorAsignadoId === undefined) {
      // No se incluyó el campo, no hacemos nada con el colaborador
    } 
    else if (colaboradorAsignadoId === null) {
      // Caso 2: Se quiere des-asignar (poner en null)
      pendiente.colaboradorAsignado = null;
      pendiente.fechaAsignacion = null; // Limpiamos la fecha de asignación
    } 
    else {
      // Caso 3: Se quiere asignar o re-asignar (es un número)
      const colaborador = await this.usuariosRepository.findOneBy({ id: colaboradorAsignadoId });
      if (!colaborador) {
        throw new NotFoundException(`Colaborador con ID "${colaboradorAsignadoId}" no encontrado`);
      }
      
      // Asigna el nuevo colaborador
      pendiente.colaboradorAsignado = colaborador;
      
      // Solo actualiza la fecha si es la primera vez que se asigna
      if (!pendiente.fechaAsignacion) {
        pendiente.fechaAsignacion = new Date();
      }
    }
    // --- 👆 FIN DE LA LÓGICA CORREGIDA ---
    // Lógica para fecha de conclusión (esta estaba bien)
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
