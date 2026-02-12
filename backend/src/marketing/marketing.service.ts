import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, DataSource } from 'typeorm';

// ENTIDADES
import { MarketingCliente } from './entities/marketing-cliente.entity';
import { CentroEducativo } from './entities/centro-educativo.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Caso } from '../casos/entities/caso.entity';
import { EstadosCasosService } from '../estados-casos/estados-casos.service';
import { CreateMarketingDto } from './dto/create-marketing.dto';

// CONSTANTES
const FASES = {
  COMBOS: '1',
  LANZAMIENTO: '2',
  EXTERIOR: '3',
  PRE_GRAD: '4',
  GRADUACION: '5'
};

const TIPOS_TAREA = {
  ARTES: 'ARTES_AVANZADA',
  ENCUESTA: 'ENCUESTA',
  RECOLECCION: 'RECOLECCION',
  RETOQUE: 'RETOQUE',
  IMPRESION: 'IMPRESION',
  WEB: 'WEB',
  REDES: 'REDES',
  REVISTA: 'REVISTA',
  MURAL: 'MURAL'
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

// 👇 NORMALIZADOR FUERA DE LA CLASE
const normalizar = (texto: string) => {
  return texto
    ? texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
    : "";
};

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectRepository(MarketingCliente)
    private marketingRepository: Repository<MarketingCliente>,
    
    @InjectRepository(CentroEducativo)
    private centrosRepository: Repository<CentroEducativo>,

    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,

    @InjectRepository(Usuario) 
    private usuarioRepository: Repository<Usuario>,

    @InjectRepository(Caso) 
    private casosRepository: Repository<Caso>,
    
    private estadosCasosService: EstadosCasosService,
    private dataSource: DataSource,
  ) {}

  // =================================================================
  // 1. MÉTODOS CRUD BÁSICO
  // =================================================================

  async create(createDto: CreateMarketingDto) {
    const nuevo = this.marketingRepository.create({ ...createDto, eventos_data: {} });
    return this.marketingRepository.save(nuevo);
  }

  findAll() {
    return this.marketingRepository.find({ where: { activo: true }, order: { fecha_creacion: 'DESC' } });
  }

  async findOne(id: number) {
    const cliente = await this.marketingRepository.findOneBy({ id });
    if (!cliente) throw new NotFoundException(`Cliente #${id} no encontrado`);
    return cliente;
  }

  async update(id: number, updateDto: any) {
    const cliente = await this.findOne(id);
    this.marketingRepository.merge(cliente, updateDto);
    return this.marketingRepository.save(cliente);
  }

  async updateEvento(id: number, eventoKey: string, datos: any) {
    const cliente = await this.findOne(id);
    if (!cliente.eventos_data[eventoKey]) {
        cliente.eventos_data[eventoKey] = {};
    }
    cliente.eventos_data[eventoKey] = { ...cliente.eventos_data[eventoKey], ...datos };
    const copia = { ...cliente.eventos_data };
    cliente.eventos_data = copia;
    return this.marketingRepository.save(cliente);
  }

  async sincronizarCentros() {
    // Método legacy, se mantiene para no romper el controlador
    return { mensaje: 'Método legacy (sin uso actual)' };
  }

  async findAllCentros() {
    return this.centrosRepository.find({ where: { visible: true }, order: { nombre: 'ASC' } });
  }

  async findAllCentrosAdmin() {
    return this.centrosRepository.find({ order: { nombre: 'ASC' } });
  }

  async toggleVisibilidadCentro(id: number) {
    const centro = await this.centrosRepository.findOneBy({ id });
    if (!centro) throw new NotFoundException('Centro no encontrado');
    centro.visible = !centro.visible;
    return this.centrosRepository.save(centro);
  }

  // =================================================================
  // 2. CREACIÓN MAESTRA + SIEMBRA INTELIGENTE 🌱🧠
  // =================================================================
  
  // 👇 BUSCADOR BLINDADO: ENTIENDE ARRAYS Y TEXTO (SOLUCIONA EL BUG VISUAL)
  private async obtenerEspecialista(todosUsuarios: Usuario[], departamento: string): Promise<Usuario | null> {
    const depBuscado = normalizar(departamento); 
    
    // LOG CHIVATO: Veremos qué está leyendo realmente
    console.log(`🔎 BUSCANDO EXPERTO EN: '${depBuscado}'...`);

    const especialista = todosUsuarios.find(u => {
        // 1. Si no tiene departamentos, descartado.
        if (!u.departamentos) return false;

        let misDeptos: string[] = [];

        // 2. TRADUCTOR UNIVERSAL:
        if (Array.isArray(u.departamentos)) {
            // Si ya es un array, perfecto
            misDeptos = u.departamentos;
        } else if (typeof u.departamentos === 'string') {
            // 🚨 AQUÍ ESTÁ LA CLAVE: Si es texto "Logistica, Colector", lo convertimos a array
            misDeptos = (u.departamentos as string).split(',').map(s => s.trim());
        }

        // 3. COMPARACIÓN (Ignorando mayúsculas y acentos)
        const tieneInsignia = misDeptos.some(d => normalizar(d) === depBuscado);
        
        // CHIVATO VIP PARA JESÚS
        if (u.username && u.username.toLowerCase().includes('jesus')) {
             console.log(`🧐 ESCANEANDO A JESÚS:`);
             console.log(`   - Lo que tiene en BD: ${JSON.stringify(u.departamentos)}`);
             console.log(`   - Lo que entendió el sistema: ${JSON.stringify(misDeptos)}`);
             console.log(`   - ¿Coincide con '${depBuscado}'? ${tieneInsignia ? 'SI ✅' : 'NO ❌'}`);
        }

        return tieneInsignia;
    });

    return especialista || null;
  }

  async createCentroMaster(nombre: string, tipo: string = 'cliente', asesor?: string, padre?: string, tio?: string) {
    if (!nombre) throw new BadRequestException('El nombre es obligatorio');

    const existe = await this.centrosRepository.findOne({ where: { nombre: ILike(nombre.trim()) } });
    if (existe) throw new BadRequestException(`Ya existe un centro llamado "${existe.nombre}"`);

    // 1. Guardamos el Centro
    const nuevo = this.centrosRepository.create({ 
        nombre: nombre.trim(),
        tipo: tipo,
        visible: true,
        asesor: asesor || null,
        padre: padre || null, 
        tio: tio || null      
    } as any);
    const centroGuardado: any = await this.centrosRepository.save(nuevo);

    // 2. Cargamos Actores
    const todosUsuarios = await this.usuarioRepository.find({ select: ['id', 'nombreCompleto', 'username', 'departamentos'] });
    
    const usuarioPadre = padre ? todosUsuarios.find(u => normalizar(u.username) === normalizar(padre)) : null;
    const usuarioTio = tio ? todosUsuarios.find(u => normalizar(u.username) === normalizar(tio)) : null;
    
    // BÚSQUEDA DE ESPECIALISTAS
    const especialistaArtes = await this.obtenerEspecialista(todosUsuarios, 'Artes');
    const especialistaImpresion = await this.obtenerEspecialista(todosUsuarios, 'Impresion');
    const especialistaColector = await this.obtenerEspecialista(todosUsuarios, 'Colector'); 
    // 👇 NUEVO: Buscamos Coordinación
    const especialistaCoord = await this.obtenerEspecialista(todosUsuarios, 'Coordinacion');

    // LOG DE CONTROL
    if (especialistaColector) console.log(`✅ LOGISTICA ENCONTRADO: ${especialistaColector.username}`);
    else console.log(`❌ LOGISTICA NO ENCONTRADO (buscando Colector)`);

    // 3. SIEMBRA DE HITOS
    if (centroGuardado && centroGuardado.id) {
        this.logger.log(`🌱 Sembrando árbol de tareas para: ${centroGuardado.nombre}`);

        const fasesASembrar = [
            { nombre: 'Combos', key: FASES.COMBOS },
            { nombre: 'Lanzamiento', key: FASES.LANZAMIENTO },
            { nombre: 'Exterior', key: FASES.EXTERIOR },
            { nombre: 'Pre-Graduación', key: FASES.PRE_GRAD },
            { nombre: 'Graduación', key: FASES.GRADUACION },
        ];

        for (const fase of fasesASembrar) {
            // A. Artes (Diseño)
            if (fase.key === FASES.LANZAMIENTO || fase.key === FASES.GRADUACION) {
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.ARTES, 
                    `🎨 Artes: Diseño ${fase.nombre}`, especialistaArtes || usuarioPadre, 'Artes');
            }

            // B. Logística / Recolección
            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.RECOLECCION, 
                `📸 Logística: Recolección ${fase.nombre}`, especialistaColector || usuarioPadre, 'Logistica');

            // C. Marketing / Encuestas
            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.ENCUESTA, 
                `📋 Marketing: Encuestas ${fase.nombre}`, usuarioTio || usuarioPadre, 'Marketing');

            // D. Retoque
            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.RETOQUE, 
                `✨ Edición: Retoque ${fase.nombre}`, usuarioPadre, 'Produccion');

            // E. Salidas Finales
            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.IMPRESION, 
                `🖨️ Taller: Impresión ${fase.nombre}`, especialistaImpresion || usuarioPadre, 'Impresion');

            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.WEB, 
                `🌐 Web: Carga Marketplace ${fase.nombre}`, usuarioTio || usuarioPadre, 'Marketing');
            
            await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.REDES, 
                `📱 Redes: Publicación Social ${fase.nombre}`, usuarioTio || usuarioPadre, 'Marketing');

            // Extras Pre-Grad
            if (fase.key === FASES.PRE_GRAD) {
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.REVISTA, 
                    `📖 Revista: Maquetación`, especialistaArtes || usuarioPadre, 'Artes');
            }

            // 👇 --- NUEVA LOGÍSTICA DE GRADUACIÓN (Opción B) --- 👇
            if (fase.key === FASES.GRADUACION) {
                // Mural (El original)
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.MURAL, 
                    `🎨 Mural: Diseño Final`, especialistaArtes || usuarioPadre, 'Artes');

                // A. COORDINACIÓN (Guiones)
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.GUION,
                    `🎤 Logística: Guion Maestro de Ceremonias`, especialistaCoord || usuarioPadre, 'Coordinacion');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.PROG_EVENTO,
                    `📅 Logística: Programa Coordinador del Evento`, especialistaCoord || usuarioPadre, 'Coordinacion');


                // B. ENCARGADO DEL CENTRO (Papelería)
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.PERGAMINO,
                    `📜 Diseño: Pergaminos Colación de Grado`, usuarioPadre, 'Produccion');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.RECONOCIMIENTOS,
                    `🏆 Diseño: Reconocimientos Varios`, usuarioPadre, 'Produccion');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.MEMBRETES,
                    `📄 Diseño: Membretes Mesa Directiva`, usuarioPadre, 'Produccion');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.PROG_SILLA,
                    `🪑 Diseño: Programas de Sillas`, usuarioPadre, 'Produccion');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.RESERVADO,
                    `🚫 Diseño: Letreros Reservado`, usuarioPadre, 'Produccion');


                // C. MARKETING / TÍA (Videos)
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.VIDEO_TBT,
                    `🎥 Video: Creación TBT`, usuarioTio || usuarioPadre, 'Marketing');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.VIDEO_VIVENCIAS,
                    `🎬 Video: Creación Vivencias`, usuarioTio || usuarioPadre, 'Marketing');

                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_LOGISTICA.VISUALES,
                    `📺 Video: Visuales Especiales / Póstumo`, usuarioTio || usuarioPadre, 'Marketing');
            }
        }
    }
    return centroGuardado;
  }
  // 👇 VERSIÓN FINAL: Acepta nombre del autor
  private async crearTareaSemilla(centro: string, fase: any, tipo: string, desc: string, responsable: any, area: string, autorNombre: string = 'SISTEMA') {
    
    // 🛡️ PARCHE DE SEGURIDAD:
    // Creamos referencia limpia al colaborador
    const colaboradorRef = responsable && responsable.id ? { id: responsable.id } : null;

    const tarea = this.pendientesRepository.create({
        nombreCentro: centro,
        descripcion: desc,
        colaboradorAsignado: colaboradorRef,
        area: area,
        status: 'STANDBY', 
        esHito: true,
        eventoKey: fase.key,
        tipoHito: tipo,
        // 👇 AQUÍ ESTÁ EL CAMBIO: Usamos la variable 'autorNombre'
        historial: [{ fecha: new Date(), autor: autorNombre, accion: 'SIEMBRA', nota: 'Hito creado en espera.' }]
    } as any);
    
    // Guardamos directo
    return this.pendientesRepository.save(tarea);
  }
  async updateCentroMaster(id: number, nombre: string, tipo?: string, asesor?: string, padre?: string, tio?: string) {
    const centro = await this.centrosRepository.findOneBy({ id });
    if (!centro) throw new NotFoundException('Centro no encontrado');
    centro.nombre = nombre.trim();
    if (tipo !== undefined) centro.tipo = tipo; 
    if (asesor !== undefined) centro.asesor = asesor;
    if (padre !== undefined) centro.padre = padre;
    if (tio !== undefined) centro.tio = tio;
    return this.centrosRepository.save(centro);
  }
// =================================================================
  // 🗑️ ELIMINAR CENTRO (VERSIÓN BLINDADA CON LOGS)
  // =================================================================
  async deleteCentroMaster(id: number) {
    console.log(`🗑️ REQUEST DELETE RECIBIDO PARA ID: ${id}`); 

    const centro = await this.centrosRepository.findOneBy({ id });
    
    if (!centro) {
        console.warn(`❌ El centro con ID ${id} no existe en la base de datos.`);
        throw new NotFoundException('Centro no encontrado');
    }

    try {
        // Intentamos borrar
        const resultado = await this.centrosRepository.remove(centro);
        console.log(`✅ Centro "${centro.nombre}" eliminado correctamente.`);
        return resultado;

    } catch (error) {
        console.error(`🔥 ERROR AL BORRAR ID ${id}:`, error.message);
        
        // Código de error Postgres para "Violación de llave foránea" (tiene hijos)
        if (error.code === '23503') { 
            throw new BadRequestException(`⛔ NO SE PUEDE BORRAR: El centro "${centro.nombre}" tiene tareas o datos históricos asociados. Borra sus tareas primero.`);
        }
        
        throw new BadRequestException('Error de base de datos al intentar borrar.');
    }
  }
  // =================================================================
  // 4. MATRIZ DE ACTIVACIONES
  // =================================================================
  async getActivationMatrix() {
    const centros = await this.centrosRepository.find({
        where: { tipo: 'cliente', visible: true },
        order: { nombre: 'ASC' }
    });

    const matriz: any[] = []; 

    for (const centro of centros) {
        const tareas = await this.pendientesRepository.find({
            where: { nombreCentro: centro.nombre },
            select: ['id', 'tipoHito', 'eventoKey', 'status', 'area'] 
        });

        const getStatus = (eventoKey: string, tipo: string) => {
            const tarea = tareas.find(t => t.eventoKey === eventoKey && t.tipoHito === tipo);
            return tarea ? tarea.status : 'NO_EXISTE'; 
        };

        matriz.push({
            id: centro.id,
            nombre: centro.nombre,
            padre: centro.padre || 'Sin Asignar',
            
            combos_logistica: getStatus('1', 'RECOLECCION'),
            lanzamiento_artes: getStatus('2', 'ARTES_AVANZADA'), 
            lanzamiento_logistica: getStatus('2', 'RECOLECCION'),
            exterior_logistica: getStatus('3', 'RECOLECCION'),
            pre_logistica: getStatus('4', 'RECOLECCION'),
            graduacion_artes: getStatus('5', 'ARTES_AVANZADA'), 
            graduacion_logistica: getStatus('5', 'RECOLECCION'),
        });
    }

    return matriz;
  }
// =================================================================
  // 5. EL DESPERTADOR AUTOMÁTICO (Versión Híbrida: Jesús + Logística + Identidad) 💉
  // =================================================================
  async activarEtapa(centroId: number, eventoKey: string, fase: string, userId: number = 1) {
    const centro = await this.centrosRepository.findOneBy({ id: centroId });
    if (!centro) throw new NotFoundException('Centro no encontrado');

    // 👇 1. BUSCAMOS QUIÉN DIO LA ORDEN (Para no poner "SISTEMA")
    const autorOrden = await this.usuarioRepository.findOneBy({ id: userId });
    const nombreAutor = autorOrden ? autorOrden.username : 'SISTEMA';

    // 2. DEFINIMOS QUÉ QUEREMOS ACTIVAR
    let tiposAfectados: string[] = [];

    if (fase === 'ARTES') {
        tiposAfectados = [TIPOS_TAREA.ARTES, TIPOS_TAREA.MURAL, TIPOS_TAREA.REVISTA]; 
    } 
    else if (fase === 'GENERAL') {
        tiposAfectados = [TIPOS_TAREA.RECOLECCION, TIPOS_TAREA.ENCUESTA];
    }
    // 👇 AQUÍ AGREGAMOS LA NUEVA OPCIÓN (SIN TOCAR LO DEMÁS)
    else if (fase === 'LOGISTICA') {
        tiposAfectados = [
            TIPOS_LOGISTICA.GUION, TIPOS_LOGISTICA.PROG_EVENTO,
            TIPOS_LOGISTICA.PERGAMINO, TIPOS_LOGISTICA.RECONOCIMIENTOS, 
            TIPOS_LOGISTICA.MEMBRETES, TIPOS_LOGISTICA.PROG_SILLA, TIPOS_LOGISTICA.RESERVADO,
            TIPOS_LOGISTICA.VIDEO_TBT, TIPOS_LOGISTICA.VIDEO_VIVENCIAS, TIPOS_LOGISTICA.VISUALES
        ];
    }
    else {
        throw new BadRequestException('Fase no válida.');
    }

    // 🌟 NUEVO: MAGIA RETROACTIVA (Solo para Logística en Centros Viejos)
    // Verifica si faltan las tareas y las crea antes de intentar activarlas.
    if (fase === 'LOGISTICA') {
        // Buscamos tareas existentes
        const tareasExistentes = await this.pendientesRepository.find({
            where: { nombreCentro: centro.nombre, eventoKey: eventoKey }
        });

        // Preparamos datos por si hay que crear (Solo si faltan)
        const todosUsuarios = await this.usuarioRepository.find();
        const centroData = await this.centrosRepository.findOneBy({ id: centro.id }); // Recargamos para ver padres
        
        const usuarioPadre = centroData?.padre ? todosUsuarios.find(u => normalizar(u.username) === normalizar(centroData.padre)) : null;
        const usuarioTio = centroData?.tio ? todosUsuarios.find(u => normalizar(u.username) === normalizar(centroData.tio)) : null;
        const especialistaCoord = await this.obtenerEspecialista(todosUsuarios, 'Coordinacion');

        for (const tipoNuevo of tiposAfectados) {
            const existe = tareasExistentes.find(t => t.tipoHito === tipoNuevo);
            
            if (!existe) {
                console.log(`✨ Auto-Reparación: Creando tarea logística faltante -> ${tipoNuevo}`);
                
                let responsable = usuarioPadre; // Default al Encargado
                let area = 'Produccion';

                // Asignación inteligente según el tipo (igual que en createCentroMaster)
                if ([TIPOS_LOGISTICA.GUION, TIPOS_LOGISTICA.PROG_EVENTO].includes(tipoNuevo)) {
                    responsable = especialistaCoord || usuarioPadre;
                    area = 'Coordinacion';
                }
                else if ([TIPOS_LOGISTICA.VIDEO_TBT, TIPOS_LOGISTICA.VIDEO_VIVENCIAS, TIPOS_LOGISTICA.VISUALES].includes(tipoNuevo)) {
                    responsable = usuarioTio || usuarioPadre;
                    area = 'Marketing';
                }

                // 👇 AQUÍ LA CLAVE: Pasamos 'nombreAutor' al final
                await this.crearTareaSemilla(centro.nombre, { key: eventoKey }, tipoNuevo, `Tarea: ${tipoNuevo}`, responsable, area, nombreAutor);
            }
        }
    }
    // 🌟 FIN DE LA MAGIA RETROACTIVA

    // 3. BÚSQUEDA Y ACTIVACIÓN (TU LÓGICA ORIGINAL)
    // Volvemos a buscar para asegurarnos de traer las nuevas si se crearon
    const tareas = await this.pendientesRepository.find({
        where: { nombreCentro: centro.nombre, eventoKey: eventoKey },
        relations: ['colaboradorAsignado'] 
    });

    let arregladas = 0;

    for (const tarea of tareas) {
        if (tiposAfectados.includes(tarea.tipoHito)) {
            
            console.log(`💉 INYECCIÓN AUTOMÁTICA EN TAREA ID: ${tarea.id}`);

            // 4. ASIGNACIÓN DE EMERGENCIA (TU LÓGICA DE JESÚS - INTACTA)
            if (!tarea.colaboradorAsignado) {
                console.log("   -> Vacante detectada. Asignando a Jesús (ID 4).");
                tarea.colaboradorAsignado = { id: 4 } as any; 
            } else {
                 console.log(`   -> Ya tiene dueño (ID ${tarea.colaboradorAsignado.id}). Respetando.`);
            }

            // 5. ESTADO 'Pendiente'
            tarea.status = 'Pendiente'; 
            tarea.fechaAsignacion = new Date();

            await this.pendientesRepository.save(tarea);
            arregladas++;
        }
    }

    return { mensaje: `💉 SE INYECTARON/ACTIVARON ${arregladas} TAREAS CORRECTAMENTE.` };
  }
}