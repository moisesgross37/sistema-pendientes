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

    // LOG DE CONTROL (Ver en consola si encontró a Jesús)
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

            // B. Logística / Recolección (AQUÍ USAMOS AL COLECTOR JESÚS)
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

            // Extras
            if (fase.key === FASES.PRE_GRAD) {
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.REVISTA, 
                    `📖 Revista: Maquetación`, especialistaArtes || usuarioPadre, 'Artes');
            }
            if (fase.key === FASES.GRADUACION) {
                await this.crearTareaSemilla(centroGuardado.nombre, fase, TIPOS_TAREA.MURAL, 
                    `🎨 Mural: Diseño Final`, especialistaArtes || usuarioPadre, 'Artes');
            }
        }
    }
    return centroGuardado;
  }

  // 👇 COPIA Y PEGA ESTO EN TU MARKETING.SERVICE.TS (REEMPLAZANDO LA FUNCIÓN ANTERIOR)
  private async crearTareaSemilla(centro: string, fase: any, tipo: string, desc: string, responsable: any, area: string) {
    
    // 🛡️ PARCHE DE SEGURIDAD:
    // En lugar de pasar el objeto "responsable" (que puede venir incompleto),
    // creamos una referencia directa usando SOLO su ID. TypeORM ama esto.
    const colaboradorRef = responsable && responsable.id ? { id: responsable.id } : null;

    // LOG DE CONFIRMACIÓN (Para que veas en consola que el ID viaja bien)
    if (area === 'Logistica' || area === 'Colector') {
        console.log(`🛡️ GUARDANDO TAREA ${tipo} -> ASIGNADO A ID: ${colaboradorRef?.id || 'VACANTE (NULL)'}`);
    }

    const tarea = this.pendientesRepository.create({
        nombreCentro: centro,
        descripcion: desc,
        colaboradorAsignado: colaboradorRef, // 👈 AQUÍ ESTÁ LA CLAVE
        area: area,
        status: 'STANDBY', 
        esHito: true,
        eventoKey: fase.key,
        tipoHito: tipo,
        historial: [{ fecha: new Date(), autor: 'SISTEMA', accion: 'SIEMBRA', nota: 'Hito creado en espera.' }]
    } as any);
    
    // Guardamos directo, sin intermediarios
    return this.pendientesRepository.save(tarea);
  }

  // =================================================================
  // 3. MÉTODOS DE GESTIÓN DE CENTROS (UPDATE / DELETE)
  // =================================================================
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

  async deleteCentroMaster(id: number) {
    const centro = await this.centrosRepository.findOneBy({ id });
    if (!centro) throw new NotFoundException('Centro no encontrado');
    return this.centrosRepository.remove(centro);
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
  // 5. EL DESPERTADOR AUTOMÁTICO (Igual que la Inyección Manual) 💉
  // =================================================================
  async activarEtapa(centroId: number, eventoKey: string, fase: 'ARTES' | 'GENERAL') {
    const centro = await this.centrosRepository.findOneBy({ id: centroId });
    if (!centro) throw new NotFoundException('Centro no encontrado');

    // 1. DEFINIMOS QUÉ QUEREMOS ACTIVAR
    let tiposAfectados: string[] = [];
    if (fase === 'ARTES') {
        tiposAfectados = [TIPOS_TAREA.ARTES, TIPOS_TAREA.MURAL, TIPOS_TAREA.REVISTA]; 
    } else if (fase === 'GENERAL') {
        tiposAfectados = [TIPOS_TAREA.RECOLECCION, TIPOS_TAREA.ENCUESTA];
    } else {
        throw new BadRequestException('Fase no válida.');
    }

    // 2. BÚSQUEDA (CON LOS LENTES PUESTOS 👓)
    // Traemos la tarea y su colaborador para ver si ya existe
    const tareas = await this.pendientesRepository.find({
        where: { nombreCentro: centro.nombre, eventoKey: eventoKey },
        relations: ['colaboradorAsignado'] 
    });

    let arregladas = 0;

    for (const tarea of tareas) {
        if (tiposAfectados.includes(tarea.tipoHito)) {
            
            console.log(`💉 INYECCIÓN AUTOMÁTICA EN TAREA ID: ${tarea.id}`);

            // 3. ASIGNACIÓN DE JESÚS (SI ESTÁ VACÍA)
            // Verificamos si NO tiene colaborador (null)
            if (!tarea.colaboradorAsignado) {
                console.log("   -> Vacante detectada. Asignando a Jesús (ID 4).");
                tarea.colaboradorAsignado = { id: 4 } as any; 
            } else {
                 console.log(`   -> Ya tiene dueño (ID ${tarea.colaboradorAsignado.id}). Respetando.`);
            }

            // 4. ESTADO 'Pendiente' (VITAL PARA QUE JESÚS LA VEA)
            // Igual que hicimos en la consola del navegador
            tarea.status = 'Pendiente'; 
            tarea.fechaAsignacion = new Date();

            await this.pendientesRepository.save(tarea);
            arregladas++;
        }
    }

    return { mensaje: `💉 SE INYECTARON/ACTIVARON ${arregladas} TAREAS CORRECTAMENTE.` };
  }
} // 👈 CIERRE DEL ARCHIVO