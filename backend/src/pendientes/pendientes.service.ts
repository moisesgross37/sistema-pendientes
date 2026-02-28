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
const TIPOS_LOGISTICA = {
  // Coordinación
  GUION: 'GUION_MAESTRO',
  PROG_EVENTO: 'PROGRAMA_EVENTO',

  // Encargado (Van a Imprenta)
  PERGAMINO: 'PERGAMINOS',
  RECONOCIMIENTOS: 'RECONOCIMIENTOS',
  MEMBRETES: 'MEMBRETES_MESA',
  PROG_SILLA: 'PROGRAMA_SILLA',
  RESERVADO: 'LETREROS_RESERVADO',

  // Marketing (Videos)
  VIDEO_TBT: 'VIDEO_TBT',
  VIDEO_VIVENCIAS: 'VIDEO_VIVENCIAS',
  VISUALES: 'VISUALES_ESPECIALES' // Cuadrícula/Póstumo
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

    // 👇 Capturamos el nombre real del usuario que crea la tarea
    const nombreAutor = asesor.username;

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
        // 👇 AQUÍ USAMOS LA VARIABLE nombreAutor EN LUGAR DE 'SISTEMA'
        historial: [{ fecha: new Date(), autor: nombreAutor, nota: 'Creación', accion: 'Creación' }],
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

 // 3. UPDATE & DOMINÓ (Versión con registro de transferencia)
  async update(id: number, updateDto: UpdatePendienteDto | any) {
    const pendiente = await this.findOne(id);
    const estadoAnterior = pendiente.status;

    // 👇 LÓGICA DE TRANSFERENCIA E HISTORIAL
    if (updateDto.colaboradorAsignadoId) {
        // Solo actuamos si el nuevo encargado es distinto al que ya estaba
        if (updateDto.colaboradorAsignadoId !== pendiente.colaboradorAsignado?.id) {
            const nuevoAsignado = await this.usuariosRepository.findOneBy({ id: updateDto.colaboradorAsignadoId });
            
            // Buscamos quién es el autor del movimiento usando el ID que enviamos desde el Front
            const autorMovimiento = updateDto.autorId 
                ? await this.usuariosRepository.findOneBy({ id: updateDto.autorId }) 
                : null;
            
            const nombreAutor = autorMovimiento ? autorMovimiento.username : 'SISTEMA';

            if (nuevoAsignado) { 
                pendiente.colaboradorAsignado = nuevoAsignado; 
                pendiente.fechaAsignacion = new Date(); 
                
                // 📝 AGREGAMOS EL MOVIMIENTO AL HISTORIAL
                const notaFinal = updateDto.notaTransferencia || `Tarea transferida a ${nuevoAsignado.username}.`;
                
                pendiente.historial.push({
                    fecha: new Date(),
                    autor: nombreAutor, // Aquí aparecerá tu nombre
                    accion: 'TRANSFERENCIA',
                    nota: notaFinal
                });
            }
        }
        // Limpiamos los campos que no pertenecen a la tabla 'Pendiente' antes de guardar
        delete updateDto.colaboradorAsignadoId;
        delete updateDto.autorId; 
    }

    // Aplicamos el resto de los cambios (como el status)
    Object.assign(pendiente, updateDto);
    const actualizado = await this.pendientesRepository.save(pendiente);

    // Lógica de efecto dominó (se mantiene igual)
    const esTerminado = (actualizado.status === 'Terminado' || actualizado.status === 'Concluido' || actualizado.status === 'En Impresión');
    if (esTerminado && estadoAnterior !== actualizado.status) {
        await this.procesarEfectoDomino(actualizado);
    }
    return actualizado;
  }
  // 👇 PEGA ESTO PARA ARREGLAR EL ERROR DE RENDER
  async remove(id: number) {
    const p = await this.findOne(id);
    return this.pendientesRepository.remove(p);
  }
// ==========================================
  // 📝 LÓGICA PARA GUARDAR EN LA BITÁCORA
  // ==========================================
  async agregarComentario(id: number, nota: string, autor: string, accion: string) {
    // 1. Buscamos la tarea
    const pendiente = await this.pendientesRepository.findOne({ where: { id } });
    
    if (!pendiente) {
      throw new Error('Tarea no encontrada');
    }

    // 2. Preparamos el nuevo evento
    const nuevoEvento = {
      fecha: new Date().toISOString(),
      autor: autor,
      accion: accion, // Ejemplo: 'COMENTARIO', 'OBSERVACIÓN', 'DEVOLUCIÓN'
      nota: nota
    };

    // 3. Si no tenía historial, lo creamos vacío
    if (!pendiente.historial) {
      pendiente.historial = [];
    }

    // 4. Agregamos el evento al principio (para que salga el más nuevo arriba) o al final
    // Vamos a usar push para agregarlo al final (orden cronológico)
    let historialActual = pendiente.historial;
    
    // Truco: PostgreSQL a veces devuelve JSON como string, aseguramos que sea array
    if (typeof historialActual === 'string') {
        historialActual = JSON.parse(historialActual);
    }
    
    historialActual.push(nuevoEvento);

    // 5. Guardamos y actualizamos la fecha de la tarea para que se mueva si es necesario
    pendiente.historial = historialActual;
    
    // Opcional: Si quieres que al comentar se actualice la fecha "updatedAt"
    // pendiente.updatedAt = new Date(); 

    return this.pendientesRepository.save(pendiente);
  }
  // =================================================================
  // 4. CEREBRO DOMINÓ (VERSIÓN AUTO-REPARABLE - LÓGICA MOISÉS) 🧠🔧
  // =================================================================
  private async procesarEfectoDomino(origen: Pendiente) {
    this.logger.log(`⛓️ Dominó iniciado por: ${origen.tipoHito} (Evento: ${origen.eventoKey})`);

    // 1. Definimos QUÉ tareas deben despertar según quién terminó
    let despertar: string[] = [];

    // A. TERMINÓ FOTOS (RECOLECCION) -> Sigue Retoque
    if (origen.tipoHito === TIPOS.RECOLECCION) {
        despertar.push(TIPOS.RETOQUE); 
        
        if (origen.eventoKey === FASES.PRE_GRAD) {
            despertar.push(TIPOS.REVISTA);
            despertar.push(TIPOS.FOTOS_EXTRAS); 
        }
        if (origen.eventoKey === FASES.GRADUACION) despertar.push(TIPOS.MURAL);
    }

    // B. TERMINÓ RETOQUE
    else if (origen.tipoHito === TIPOS.RETOQUE) {
        // Siempre despierta a WEB y REDES (Para las Tías)
        despertar.push(TIPOS.WEB, TIPOS.REDES);
        
        // 🔒 SOLO despierta IMPRESIÓN en las fases que TÚ indicaste
        const fasesConImpresion = [FASES.EXTERIOR, FASES.PRE_GRAD, FASES.GRADUACION];
        
        if (fasesConImpresion.includes(origen.eventoKey)) {
            despertar.push(TIPOS.IMPRESION); 
        }
    }

    // 2. Buscamos tareas dormidas (STANDBY)
    const tareasDormidas = await this.pendientesRepository.find({
        where: { nombreCentro: origen.nombreCentro, eventoKey: origen.eventoKey, status: 'STANDBY' },
        relations: ['colaboradorAsignado', 'casos'] 
    });

    // 3. EJECUCIÓN AUTO-REPARABLE (La Magia)
    for (const tipoDestino of despertar) {
        
        let tarea = tareasDormidas.find(t => t.tipoHito === tipoDestino);
        let esNueva = false;

        // SI NO EXISTE LA TAREA -> LA CREAMOS AL VUELO (Aquí arreglamos el problema de Impresión)
        if (!tarea) {
            // Verificamos si ya existe activa para no duplicar
            const existeActiva = await this.pendientesRepository.findOne({
                where: { nombreCentro: origen.nombreCentro, eventoKey: origen.eventoKey, tipoHito: tipoDestino }
            });
            
            if (!existeActiva) {
                this.logger.log(`⚠️ No se encontró ${tipoDestino}. Creándola automáticamente...`);
                
                tarea = this.pendientesRepository.create({
                    nombreCentro: origen.nombreCentro,
                    asesor: origen.asesor,
                    area: 'Produccion',
                    status: 'Pendiente', 
                    fechaAsignacion: new Date(),
                    fechaCreacion: new Date(),
                    historial: [{ fecha: new Date(), autor: 'SISTEMA', nota: 'Creación Automática por Dominó', accion: 'Creación' }],
                    esHito: true,
                    eventoKey: origen.eventoKey,
                    tipoHito: tipoDestino
                });
                esNueva = true;
            } else {
                continue; // Si ya existe activa, no hacemos nada
            }
        }

        // 4. LÓGICA DE ASIGNACIÓN
        const centro = await this.centrosRepository.findOneBy({ nombre: origen.nombreCentro });
        
        // Grupo PADRE (Retoque, Revista, Mural, Fotos Extras)
        if ([TIPOS.RETOQUE, TIPOS.REVISTA, TIPOS.MURAL, TIPOS.FOTOS_EXTRAS].includes(tipoDestino)) {
             if (centro?.padre) {
                const padre = await this.usuariosRepository.findOneBy({ username: centro.padre });
                if (padre) tarea.colaboradorAsignado = padre;
             }
        }
        // Grupo MARKETING (Web, Redes, Encuesta - Las Tías)
        else if ([TIPOS.WEB, TIPOS.REDES, TIPOS.ENCUESTA].includes(tipoDestino)) {
            const nombreTio = (centro as any).tio || (centro as any).marketing;
            if (nombreTio) {
                const tio = await this.usuariosRepository.findOneBy({ username: nombreTio });
                if (tio) tarea.colaboradorAsignado = tio;
            } else {
                // Fallback: Busca a alguien de Marketing
                const all = await this.usuariosRepository.find();
                const marketero = all.find(u => u.departamentos && u.departamentos.includes('Marketing'));
                if (marketero) tarea.colaboradorAsignado = marketero;
            }
        }
        // Grupo IMPRESIÓN (Para Exterior, Pre y Grad)
        else if (tipoDestino === TIPOS.IMPRESION) {
            const all = await this.usuariosRepository.find();
            // Busca a alguien con insignia 'Impresion'
            const impresor = all.find(u => u.departamentos && u.departamentos.includes('Impresion'));
            if (impresor) tarea.colaboradorAsignado = impresor;
        }

        // 5. ACTIVACIÓN Y GUARDADO
        if (!esNueva) { 
            tarea.status = 'Pendiente';
            tarea.fechaAsignacion = new Date();
        }
        
        await this.pendientesRepository.save(tarea);

        // 6. RELLENO DE CASOS DE EMERGENCIA (Solo si está vacía)
        if (!tarea.casos || tarea.casos.length === 0) {
            let descripcion = `Tarea: ${tipoDestino}`;
            let servicio = 'Generico';

            if (tipoDestino === TIPOS.IMPRESION) { descripcion = '🖨️ Impresión de Fotos y Anuarios'; servicio = 'Impresion'; }
            if (tipoDestino === TIPOS.WEB) { descripcion = '🌐 Carga de Fotos a Plataforma Web'; servicio = 'Web'; }
            if (tipoDestino === TIPOS.REDES) { descripcion = '📱 Selección para Redes Sociales'; servicio = 'Marketing'; }
            if (tipoDestino === TIPOS.RETOQUE) { descripcion = '✨ Retoque Digital y Selección'; servicio = 'Edicion'; }
            
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