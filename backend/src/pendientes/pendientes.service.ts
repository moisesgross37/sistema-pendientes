import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { Pendiente } from './entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as fs from 'fs/promises';
import { join } from 'path';
import { Caso } from '../casos/entities/caso.entity';
import { EstadosCasosService } from '../estados-casos/estados-casos.service'; // <--- 1. IMPORTAR SERVICIO

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
    // --- 👇 2. INYECTAR SERVICIO ---
    private estadosCasosService: EstadosCasosService,
  ) {}

  async create(createPendienteDto: CreatePendienteDto): Promise<Pendiente> {
    const { nombreCentro, asesorId, casos } = createPendienteDto;

    const asesor = await this.usuariosRepository.findOneBy({ id: asesorId });
    if (!asesor) {
      throw new NotFoundException(`Asesor con ID "${asesorId}" no encontrado`);
    }
    if (!casos || casos.length === 0) {
      throw new BadRequestException(
        'Se debe enviar al menos un caso para crear el proyecto.',
      );
    }

    // --- 👇 3. LÓGICA DE ESTADO NUEVA ---
    // Buscamos el estado por defecto. Si no existe, el sistema falla
    // (Esto es bueno, nos obliga a crear los estados por defecto primero)
    const estadoPendiente = await this.estadosCasosService.findOneByNombre(
      'Pendiente',
    );
    if (!estadoPendiente) {
      throw new InternalServerErrorException(
        'El estado por defecto "Pendiente" no se encuentra en la base de datos. Por favor, créelo en el panel de administración.',
      );
    }
    // --- 👆 ---

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoPendiente = this.pendientesRepository.create({
        nombreCentro,
        asesor: asesor,
        // (La 'descripcion' a nivel de pendiente ya no se usa aquí)
      });
      const pendienteGuardado = await queryRunner.manager.save(nuevoPendiente);

      for (const casoDto of casos) {
        const nuevoCaso = this.casosRepository.create({
          descripcion: casoDto.descripcion,
          imagenes: casoDto.imagenes,
          pendiente: pendienteGuardado,
          estado: estadoPendiente, // <--- 4. ASIGNAR EL OBJETO ESTADO
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

  // ESTA FUNCIÓN AHORA ES SOLO PARA ADMINS
  async findAll() {
    return this.pendientesRepository.find({
      // 'casos.estado' asegura que cargue el sub-objeto estado
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'], 
      order: { id: 'ASC' },
    });
  }
// --- PEGA Y REEMPLAZA ESTAS DOS FUNCIONES ---

  /**
   * Busca proyectos para un Asesor específico (el creador).
   */
  async findForAsesor(userId: number): Promise<Pendiente[]> {
    // La línea de 'console.log' ha sido eliminada.
    return this.pendientesRepository.find({
      where: {
        asesor: { id: userId }, // Filtra por el ID del asesor
      },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Busca proyectos para un Colaborador específico (el asignado).
   */
  async findForColaborador(userId: number): Promise<Pendiente[]> {
    // La línea de 'console.log' ha sido eliminada.
    return this.pendientesRepository.find({
      where: {
        colaboradorAsignado: { id: userId }, // Filtra por el ID del colaborador
      },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
      order: { id: 'ASC' },
    });
  }

  // --- FIN DEL BLOQUE A REEMPLAZAR ---
// ...
  findOne(id: number) {
    return this.pendientesRepository.findOne({
      where: { id },
      relations: ['asesor', 'colaboradorAsignado', 'casos', 'casos.estado'],
    });
  }

  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    // Esta función solo actualiza el 'Pendiente' (asignación y estado general),
    // no los 'Casos', por lo que no necesita cambios mayores.

    const { colaboradorAsignadoId, status } = updatePendienteDto;
    const pendiente = await this.pendientesRepository.findOne({
      where: { id },
      relations: ['colaboradorAsignado'],
    });
    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }
    if (colaboradorAsignadoId === undefined) {
    } else if (colaboradorAsignadoId === null) {
      pendiente.colaboradorAsignado = null;
      pendiente.fechaAsignacion = null;
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
    }

    // El 'status' (del Pendiente) sigue siendo un string, así que esto está bien.
    if (status && status === 'Concluido' && pendiente.status !== 'Concluido') {
      pendiente.fechaConclusion = new Date();
    }
    if (status) {
      pendiente.status = status;
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