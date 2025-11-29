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

    // --- 🧠 LÓGICA DE AUTO-ASIGNACIÓN 🧠 ---
    
    let colaboradorAutoAsignado: Usuario | null = null; 
    let statusInicial = 'Por Asignar'; 
    let fechaAsignacionInicial: Date | null = null;
    let targetUsername = '';

    // 1. Definimos reglas
    if (area === 'Impresion') targetUsername = 'Jesus';
    else if (area === 'Coordinacion Administrativa') targetUsername = 'Yubelis'; 
    else if (area === 'Redes y Web') targetUsername = 'Alondra'; 

    // 2. Buscamos usuario
    if (targetUsername) {
      colaboradorAutoAsignado = await this.usuariosRepository.findOneBy({ username: targetUsername });
      
      if (colaboradorAutoAsignado) {
         console.log(`✅ Auto-asignando proyecto de ${area} a ${targetUsername}`);
         statusInicial = 'Iniciado'; 
         fechaAsignacionInicial = new Date(); 
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const nuevoPendiente = this.pendientesRepository.create({
        nombreCentro,
        asesor: asesor,
        area: area, 
        colaboradorAsignado: colaboradorAutoAsignado,
        status: statusInicial,
        fechaAsignacion: fechaAsignacionInicial,
        historial: [], // <--- IMPORTANTE: Inicializamos el historial vacío
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
      
      // 👇 CORRECCIÓN PARA TYPESCRIPT 👇
      const resultadoFinal = await this.findOne(pendienteGuardado.id);
      if (!resultadoFinal) {
        throw new InternalServerErrorException('Error al recuperar el proyecto guardado.');
      }
      return resultadoFinal;
      // 👆 ----------------------------

    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(
        'Falló la creación del proyecto: ' + err.message,
      );
    } finally {
      await queryRunner.release();
    }
  }

  // --- MÉTODOS DE BÚSQUEDA ---

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

  // Mantenemos la lógica de Ranking Global (retorna todo)
  async findForColaborador(userId: number): Promise<Pendiente[]> {
    return this.pendientesRepository.find({
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

  // --- 👇 UPDATE MEJORADO CON BITÁCORA DE TRANSFERENCIAS 👇 ---
  async update(id: number, updatePendienteDto: UpdatePendienteDto) {
    // Usamos 'as any' para leer la nota aunque no esté en el DTO oficial
    const { colaboradorAsignadoId, status, notaTransferencia } = updatePendienteDto as any;
    
    const pendiente = await this.pendientesRepository.findOne({
      where: { id },
      relations: ['colaboradorAsignado', 'asesor'],
    });

    if (!pendiente) {
      throw new NotFoundException(`Pendiente con ID "${id}" no encontrado`);
    }

    // Aseguramos que el array exista
    if (!pendiente.historial) {
      pendiente.historial = [];
    }

    // 1. DETECCIÓN DE TRANSFERENCIA (Cambio de dueño)
    if (colaboradorAsignadoId !== undefined && colaboradorAsignadoId !== null) {
       
       // Si el ID que llega es DIFERENTE al ID que ya tiene... es un traspaso
       if (pendiente.colaboradorAsignado?.id !== colaboradorAsignadoId) {
          const nuevoResponsable = await this.usuariosRepository.findOneBy({
            id: colaboradorAsignadoId,
          });

          if (nuevoResponsable) {
            // ¿Quién envía? Si tenía dueño, ponemos su nombre. Si no, Admin/Sistema.
            const autorNombre = pendiente.colaboradorAsignado?.username || 'Coordinación/Admin';

            // Creamos el registro
            const movimiento = {
              fecha: new Date(),
              autor: autorNombre,
              accion: `Transfirió a ${nuevoResponsable.username}`,
              nota: notaTransferencia || 'Sin nota de entrega.',
            };

            // Guardamos en el historial (unshift lo pone al principio de la lista)
            pendiente.historial.unshift(movimiento);

            // Efectuamos el cambio
            pendiente.colaboradorAsignado = nuevoResponsable;
            pendiente.fechaAsignacion = new Date(); // Reinicia el reloj de este responsable

            // Reactivamos si estaba dormido
            if (pendiente.status === 'Por Asignar' || pendiente.status === 'Detenido') {
              pendiente.status = 'Iniciado';
            }
          }
       }
    } 
    // Caso especial: Desasignar (poner en null)
    else if (colaboradorAsignadoId === null) {
        const autorNombre = pendiente.colaboradorAsignado?.username || 'Admin';
        pendiente.historial.unshift({
            fecha: new Date(),
            autor: autorNombre,
            accion: 'Liberó el proyecto (Sin Asignar)',
            nota: notaTransferencia || 'Devuelto a cola general.',
        });
        pendiente.colaboradorAsignado = null;
        pendiente.status = 'Por Asignar';
    }

    // 2. Cambio manual de estado (si se envió status)
    if (status) {
      if (status === 'Concluido' && pendiente.status !== 'Concluido') {
        pendiente.fechaConclusion = new Date();
      }
      pendiente.status = status;
    }

    return this.pendientesRepository.save(pendiente);
  }
  // --- 👆 FIN UPDATE MEJORADO 👆 ---

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