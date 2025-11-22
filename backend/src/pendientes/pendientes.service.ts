import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Caso } from '../casos/entities/caso.entity';
import { EstadosCasosService } from '../estados-casos/estados-casos.service';

@Injectable()
export class PendientesService {
  constructor(
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Caso)
    private casosRepository: Repository<Caso>,
    private dataSource: DataSource,
    private estadosCasosService: EstadosCasosService,
  ) {}

  // backend/src/pendientes/pendientes.service.ts

  // ... (imports y constructor siguen igual)

  // backend/src/pendientes/pendientes.service.ts

  async create(createPendienteDto: CreatePendienteDto): Promise<Pendiente> {
    const { nombreCentro, asesorId, casos, area } = createPendienteDto;

    const asesor = await this.usuariosRepository.findOneBy({ id: asesorId });
    if (!asesor) {
      throw new NotFoundException(`Asesor con ID "${asesorId}" no encontrado`);
    }
    if (!casos || casos.length === 0) {
      throw new BadRequestException(
        'Se debe enviar al menos un caso para crear el proyecto.',
      );
    }

    const estadoPendiente = await this.estadosCasosService.findOneByNombre(
      'Pendiente',
    );
    if (!estadoPendiente) {
      throw new InternalServerErrorException(
        'El estado por defecto "Pendiente" no se encuentra en la base de datos.',
      );
    }

    // --- 🧠 LÓGICA DE AUTO-ASIGNACIÓN (CORREGIDA CON TIPOS) 🧠 ---
    
    // Aquí estaba el error: le decimos explícitamente qué tipos permitimos
    let colaboradorAutoAsignado: Usuario | null = null; 
    let statusInicial = 'Pendiente';
    let fechaAsignacionInicial: Date | null = null;
    
    let targetUsername = '';

    // 1. Definimos reglas
    if (area === 'Impresion') {
        targetUsername = 'Adrian'; 
    } 
    else if (area === 'Coordinacion Administrativa') {
        targetUsername = 'Yubelis'; 
    } 
    else if (area === 'Redes y Web') {
        targetUsername = 'Alondra'; 
    }

    // 2. Buscamos usuario
    if (targetUsername) {
      colaboradorAutoAsignado = await this.usuariosRepository.findOneBy({ username: targetUsername });
      
      if (colaboradorAutoAsignado) {
         console.log(`✅ Auto-asignando proyecto de ${area} a ${targetUsername}`);
         statusInicial = 'Iniciado'; 
         fechaAsignacionInicial = new Date(); // Ahora sí permite guardar fecha
      } else {
         console.warn(`⚠️ Advertencia: Se intentó asignar a '${targetUsername}' pero no existe.`);
      }
    }
    // ------------------------------------------------------------

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoPendiente = this.pendientesRepository.create({
        nombreCentro,
        asesor: asesor,
        area: area, 
        colaboradorAsignado: colaboradorAutoAsignado, // TypeORM acepta null o Usuario
        status: statusInicial,
        fechaAsignacion: fechaAsignacionInicial // TypeORM acepta null o Date
      });
      
      const pendienteGuardado = await queryRunner.manager.save(nuevoPendiente);

      for (const casoDto of casos) {
        const nuevoCaso = this.casosRepository.create({
          descripcion: casoDto.descripcion,
          imagenes: casoDto.imagenes,
          pendiente: pendienteGuardado,
          estado: estadoPendiente,
        });
        await queryRunner.manager.save(nuevoCaso);
      }

      await queryRunner.commitTransaction();

      const resultado = await this.findOne(pendienteGuardado.id);
      if (!resultado) {
        throw new InternalServerErrorException(
          'No se pudo encontrar el pendiente recién creado.',
        );
      }
      return resultado;

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Falló la creación del proyecto: ' + err.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return this.pendientesRepository.find({
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'], 
      order: { id: 'ASC' },
    });
  }

  async findForAsesor(userId: number): Promise<Pendiente[]> {
    return this.pendientesRepository.find({
      where: { asesor: { id: userId } },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
      order: { id: 'ASC' },
    });
  }

  async findForColaborador(userId: number): Promise<Pendiente[]> {
    return this.pendientesRepository.find({
      where: { colaboradorAsignado: { id: userId } },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
      order: { id: 'ASC' },
    });
  }

  findOne(id: number) {
    return this.pendientesRepository.findOne({
      where: { id },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
    });
  }

  // --- ⭐ UPDATE CORREGIDO (LÓGICA AL FINAL) ⭐ ---
  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    const { colaboradorAsignadoId, status } = updatePendienteDto;
    
    const pendiente = await this.pendientesRepository.findOne({
      where: { id },
      relations: ['colaboradorAsignado'],
    });

    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }

    // 1. Cambio manual (si existe)
    if (status) {
      if (status === 'Concluido' && pendiente.status !== 'Concluido') {
        pendiente.fechaConclusion = new Date();
      }
      pendiente.status = status;
    }

    // 2. Cambio de Colaborador (Este manda sobre el status manual)
    if (colaboradorAsignadoId === undefined) {
       // Nada
    } else if (colaboradorAsignadoId === null) {
      pendiente.colaboradorAsignado = null;
      pendiente.fechaAsignacion = null;
      pendiente.status = 'Por Asignar';
    } else {
      const colaborador = await this.usuariosRepository.findOneBy({
        id: colaboradorAsignadoId,
      });
      if (!colaborador) {
        throw new NotFoundException(
          `Colaborador con ID "${colaboradorAsignadoId}" no encontrado`,
        );
      }
      pendiente.colaboradorAsignado = colaborador;
      
      if (!pendiente.fechaAsignacion) {
        pendiente.fechaAsignacion = new Date();
      }

      // Corrección: Aceptamos ambos estados iniciales
      if (pendiente.status === 'Pendiente' || pendiente.status === 'Por Asignar') {
        pendiente.status = 'Iniciado';
      }
    }

    return this.pendientesRepository.save(pendiente);
  }

  async remove(id: number): Promise<{ message: string }> {
    const pendiente = await this.pendientesRepository.findOneBy({ id });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }
    if (pendiente.imagenes && pendiente.imagenes.length > 0) {
      for (const imageName of pendiente.imagenes) {
        try {
          const imagePath = join(process.cwd(), 'uploads', imageName);
          await fs.unlink(imagePath);
        } catch (error) {
          console.error(`No se pudo eliminar el archivo ${imageName}:`, error);
        }
      }
    }
    await this.pendientesRepository.remove(pendiente);
    return { message: `Pendiente con ID #${id} eliminado correctamente.` };
  }
}