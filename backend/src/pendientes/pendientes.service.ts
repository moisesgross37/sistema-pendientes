import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Pendiente } from './entities/pendiente.entity';
import { CreatePendienteDto } from './dto/create-pendiente.dto';
import { UpdatePendienteDto } from './dto/update-pendiente.dto';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CentroEducativo } from '../marketing/entities/centro-educativo.entity';
import { Caso } from '../casos/entities/caso.entity';

const TIPOS = {
  RECOLECCION: 'RECOLECCION', 
  RETOQUE: 'RETOQUE',         
  ENCUESTA: 'ENCUESTA',       
  IMPRESION: 'IMPRESION',     
  WEB: 'WEB',                 
  REDES: 'REDES',             
  REVISTA: 'REVISTA',         
  MURAL: 'MURAL',
  ARTES: 'ARTES_AVANZADA',
  FOTOS_EXTRAS: 'FOTOS_EXTRAS' // 👈 1. TIPO NUEVO AGREGADO
};

const FASES = {
  COMBOS: '1',
  LANZAMIENTO: '2',
  EXTERIOR: '3',
  PRE_GRAD: '4',
  GRADUACION: '5'
};

@Injectable()
export class PendientesService {
  private readonly logger = new Logger(PendientesService.name);

  constructor(
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(CentroEducativo) 
    private centrosRepository: Repository<CentroEducativo>,
    @InjectRepository(Caso)
    private casosRepository: Repository<Caso>,
    private dataSource: DataSource, 
  ) {}

  // 1. CREATE
  async create(createPendienteDto: CreatePendienteDto | any): Promise<any> {
    const { nombreCentro, asesorId, area, casos } = createPendienteDto;
    const asesor = await this.usuariosRepository.findOneBy({ id: asesorId });
    if (!asesor) throw new NotFoundException(`Asesor no encontrado`);

    let colaboradorFinal: Usuario | null = null;
    let statusInicial = 'Por Asignar';
    let fechaAsignacionInicial: Date | null = null;

    // A. ¿Viene un colaborador específico?
    if (createPendienteDto.colaboradorAsignado && createPendienteDto.colaboradorAsignado.id) {
        colaboradorFinal = await this.usuariosRepository.findOneBy({ id: createPendienteDto.colaboradorAsignado.id });
    }
    // B. Si NO viene colaborador, buscamos al PADRE del Centro
    else if (nombreCentro) {
        const centro = await this.centrosRepository.findOneBy({ nombre: nombreCentro });
        if (centro && centro.padre) {
            const padre = await this.usuariosRepository.findOneBy({ username: centro.padre });
            if (padre) colaboradorFinal = padre;
        }
    }

    if (colaboradorFinal) {
         statusInicial = 'Pendiente';
         fechaAsignacionInicial = new Date();
    }

    const nuevo = this.pendientesRepository.create({
        nombreCentro, asesor, area: area || 'Produccion', colaboradorAsignado: colaboradorFinal,
        status: statusInicial, fechaAsignacion: fechaAsignacionInicial, fechaCreacion: new Date(),
        historial: [{ fecha: new Date(), autor: 'SISTEMA', nota: 'Creación', accion: 'Creación' }],
        casos: casos, esHito: createPendienteDto.esHito, eventoKey: createPendienteDto.eventoKey, tipoHito: createPendienteDto.tipoHito
    });
    return this.pendientesRepository.save(nuevo);
  }

  // 2. READ
  async findAll(user: Usuario) { 
    return this.pendientesRepository.find({ relations: ['casos', 'colaboradorAsignado'], order: { id: 'DESC' } }); 
  }

  async findOne(id: number): Promise<Pendiente> { 
    const pendiente = await this.pendientesRepository.findOne({ 
      where: { id }, 
      relations: ['casos', 'colaboradorAsignado', 'asesor'] 
    });
    if (!pendiente) throw new NotFoundException(`Pendiente #${id} no encontrado`);
    return pendiente; 
  }

  async findForAsesor(userId: number) { 
    return this.pendientesRepository.find({ where: { asesor: { id: userId } }, relations: ['casos', 'colaboradorAsignado'], order: { id: 'DESC' } }); 
  }
  
  async findForColaborador(userId: number) { 
    return this.pendientesRepository.find({ where: { colaboradorAsignado: { id: userId } }, relations: ['casos', 'asesor'], order: { id: 'DESC' } }); 
  }

  // 3. UPDATE & DOMINÓ
  async update(id: number, updateDto: UpdatePendienteDto) {
    const pendiente = await this.findOne(id);
    const estadoAnterior = pendiente.status;

    if (updateDto.colaboradorAsignadoId) {
        if (updateDto.colaboradorAsignadoId !== pendiente.colaboradorAsignado?.id) {
            const user = await this.usuariosRepository.findOneBy({ id: updateDto.colaboradorAsignadoId });
            if (user) { pendiente.colaboradorAsignado = user; pendiente.fechaAsignacion = new Date(); }
        }
        delete updateDto.colaboradorAsignadoId;
    }

    Object.assign(pendiente, updateDto);
    const actualizado = await this.pendientesRepository.save(pendiente);

    const esTerminado = (actualizado.status === 'Terminado' || actualizado.status === 'Concluido' || actualizado.status === 'En Impresión');
    if (esTerminado && estadoAnterior !== actualizado.status) {
        await this.procesarEfectoDomino(actualizado);
    }
    return actualizado;
  }

  async remove(id: number) {
    const p = await this.findOne(id);
    return this.pendientesRepository.remove(p);
  }

  // =================================================================
  // 4. CEREBRO DOMINÓ CON "FOTOS EXTRAS" 🧠📸
  // =================================================================
  private async procesarEfectoDomino(origen: Pendiente) {
    this.logger.log(`⛓️ Dominó iniciado por: ${origen.tipoHito} (Evento: ${origen.eventoKey})`);

    const tareasDormidas = await this.pendientesRepository.find({
        where: { nombreCentro: origen.nombreCentro, eventoKey: origen.eventoKey, status: 'STANDBY' },
        relations: ['colaboradorAsignado', 'casos'] 
    });

    let despertar: string[] = [];

    // A. TERMINÓ FOTOS (RECOLECCION)
    if (origen.tipoHito === TIPOS.RECOLECCION) {
        despertar.push(TIPOS.RETOQUE); // Siempre Retoque
        
        // SI ES PRE-GRADUACIÓN: Revista + Fotos Extras
        if (origen.eventoKey === FASES.PRE_GRAD) {
            despertar.push(TIPOS.REVISTA);
            despertar.push(TIPOS.FOTOS_EXTRAS); // 👈 2. AQUÍ AGREGAMOS LA NUEVA TAREA
        }
        
        if (origen.eventoKey === FASES.GRADUACION) despertar.push(TIPOS.MURAL);
    }

    // B. TERMINÓ RETOQUE
    else if (origen.tipoHito === TIPOS.RETOQUE) {
        despertar.push(TIPOS.WEB, TIPOS.REDES);
        
        const fasesConImpresion = [FASES.EXTERIOR, FASES.PRE_GRAD, FASES.GRADUACION];
        if (fasesConImpresion.includes(origen.eventoKey)) {
            despertar.push(TIPOS.IMPRESION);
        }
    }

    // EJECUCIÓN
    for (const tarea of tareasDormidas) {
        if (despertar.includes(tarea.tipoHito)) {
            
            // 1. ASIGNACIÓN
            const centro = await this.centrosRepository.findOneBy({ nombre: origen.nombreCentro });
            
            // Grupo PADRE (Agregamos FOTOS_EXTRAS aquí)
            if ([TIPOS.RETOQUE, TIPOS.REVISTA, TIPOS.MURAL, TIPOS.FOTOS_EXTRAS].includes(tarea.tipoHito)) { // 👈 3. ASIGNACIÓN AL PADRE
                 if (centro?.padre) {
                    const padre = await this.usuariosRepository.findOneBy({ username: centro.padre });
                    if (padre) tarea.colaboradorAsignado = padre;
                 }
            }
            // Grupo MARKETING
            else if ([TIPOS.WEB, TIPOS.REDES, TIPOS.ENCUESTA].includes(tarea.tipoHito)) {
                const nombreTio = (centro as any).tio || (centro as any).marketing;
                if (nombreTio) {
                    const tio = await this.usuariosRepository.findOneBy({ username: nombreTio });
                    if (tio) tarea.colaboradorAsignado = tio;
                } else {
                    const all = await this.usuariosRepository.find();
                    const marketero = all.find(u => u.departamentos && u.departamentos.includes('Marketing'));
                    if (marketero) tarea.colaboradorAsignado = marketero;
                }
            }
            // Grupo IMPRESIÓN
            else if (tarea.tipoHito === TIPOS.IMPRESION) {
                const all = await this.usuariosRepository.find();
                const impresor = all.find(u => u.departamentos && u.departamentos.includes('Impresion'));
                if (impresor) tarea.colaboradorAsignado = impresor;
            }

            // 2. ACTIVACIÓN
            tarea.status = 'Pendiente';
            tarea.fechaAsignacion = new Date();
            await this.pendientesRepository.save(tarea);

            // 3. RELLENO DE EMERGENCIA (Para evitar pantallas blancas)
            if (!tarea.casos || tarea.casos.length === 0) {
                let descripcion = `Tarea: ${tarea.tipoHito}`;
                let servicio = 'Generico';

                if (tarea.tipoHito === TIPOS.IMPRESION) { descripcion = '🖨️ Impresión de Fotos y Anuarios'; servicio = 'Impresion'; }
                if (tarea.tipoHito === TIPOS.WEB) { descripcion = '🌐 Carga de Fotos a Plataforma Web'; servicio = 'Web'; }
                if (tarea.tipoHito === TIPOS.REDES) { descripcion = '📱 Selección para Redes Sociales'; servicio = 'Marketing'; }
                if (tarea.tipoHito === TIPOS.RETOQUE) { descripcion = '✨ Retoque Digital y Selección'; servicio = 'Edicion'; }
                if (tarea.tipoHito === TIPOS.REVISTA) { descripcion = '📖 Maquetación de Revista'; servicio = 'Edicion'; }
                if (tarea.tipoHito === TIPOS.MURAL) { descripcion = '🖼️ Diseño de Mural'; servicio = 'Edicion'; }
                
                // 👈 4. DESCRIPCIÓN PARA LA NUEVA TAREA
                if (tarea.tipoHito === TIPOS.FOTOS_EXTRAS) { descripcion = '📸 Gestión de Fotos Extras y Adicionales'; servicio = 'Edicion'; }

                const nuevoCaso = this.casosRepository.create({
                    descripcion: descripcion,
                    tipo_servicio: servicio,
                    pendiente: tarea,
                    imagenes: []
                });
                await this.casosRepository.save(nuevoCaso);
            }
        }
    }
  }
}