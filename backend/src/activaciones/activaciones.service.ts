import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PendientesService } from '../pendientes/pendientes.service';
import { UsuariosService } from '../usuarios/usuarios.service'; 
import { MATRIZ_FASES } from './fases.constant';
import { CentroEducativo } from '../marketing/entities/centro-educativo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Pendiente } from '../pendientes/entities/pendiente.entity';
import { Caso } from '../casos/entities/caso.entity';

@Injectable()
export class ActivacionesService {
  constructor(
    private readonly pendientesService: PendientesService,
    private readonly usuariosService: UsuariosService,
    @InjectRepository(CentroEducativo)
    private centrosRepository: Repository<CentroEducativo>,
    @InjectRepository(Usuario)
    private usuariosRepository: Repository<Usuario>,
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
    @InjectRepository(Caso)
    private casosRepository: Repository<Caso>,
  ) {}

  async activarFaseManual(centroNombre: string, faseKey: string, usuarioId: number) {
    // 1. Configuración Segura
    let finalConfig = MATRIZ_FASES[faseKey];
    if (!finalConfig) {
        const foundKey = Object.keys(MATRIZ_FASES).find(k => faseKey.includes(k));
        if (foundKey) finalConfig = MATRIZ_FASES[foundKey];
    }
    if (!finalConfig) throw new NotFoundException(`La fase ${faseKey} no existe en la matriz.`);

    // 2. Datos del Centro
    const centro = await this.centrosRepository.findOne({ where: { nombre: centroNombre } });
    if (!centro) throw new NotFoundException('Centro no encontrado');

    // 3. Definir Responsables
    let colectorId: number | null = null;
    let tioId: number | null = null;
    let artesId: number | null = null;

    // Buscar Colector
    let expertoFoto = await this.usuariosService.findOneByDepto('Colector');
    if (!expertoFoto) expertoFoto = await this.usuariosService.findOneByDepto('Logistica');
    if (expertoFoto) colectorId = expertoFoto.id;

    // Buscar Tío
    const nombreTio = (centro as any).tio || (centro as any).marketing;
    if (nombreTio) {
        const tioUser = await this.usuariosRepository.findOne({ where: { username: nombreTio } });
        if (tioUser) tioId = tioUser.id;
    }
    if (!tioId) {
        const allUsers = await this.usuariosRepository.find();
        const marketero = allUsers.find(u => u.departamentos && u.departamentos.includes('Marketing'));
        if (marketero) tioId = marketero.id;
    }

    // Buscar Artes
    const expertoArtes = await this.usuariosService.findOneByDepto('Artes');
    if (expertoArtes) artesId = expertoArtes.id;

    // ============================================================
    // 🧠 EL DESPERTADOR BLINDADO (VISUAL FIXED) 🛡️
    // ============================================================
    const tareasDormidas = await this.pendientesRepository.find({
        where: { 
            nombreCentro: centroNombre, 
            eventoKey: finalConfig.key, 
            status: 'STANDBY' 
        },
        relations: ['colaboradorAsignado', 'casos'] 
    });

    let activadas = 0;

    for (const tarea of tareasDormidas) {
        let despertar = false;
        let responsable: any = null;
        let tituloMision = '';

        // CASO A: DISEÑO
        if ((faseKey.includes('ARTES') || faseKey.includes('DISENO')) && tarea.tipoHito === 'ARTES_AVANZADA') {
            despertar = true;
            responsable = artesId ? { id: artesId } : null;
            const textoInstruccion = finalConfig.instrucciones?.artes || finalConfig.descripcion;
            tituloMision = `🎨 Diseño: ${textoInstruccion}`;
        }

        // CASO B: LOGÍSTICA (Fotos + Encuestas)
        else if (
            !faseKey.includes('ARTES') && !faseKey.includes('DISENO') && 
            (tarea.tipoHito === 'RECOLECCION' || tarea.tipoHito === 'ENCUESTA')
        ) {
            despertar = true;
            
            if (tarea.tipoHito === 'RECOLECCION') {
                responsable = colectorId ? { id: colectorId } : null;
                const textoInstruccion = finalConfig.instrucciones?.recoleccion || finalConfig.descripcion;
                tituloMision = `📸 Fotografía: ${textoInstruccion}`;
            } 
            else if (tarea.tipoHito === 'ENCUESTA') {
                responsable = tioId ? { id: tioId } : null;
                const textoInstruccion = finalConfig.instrucciones?.encuesta || 'Gestión de Datos y Formulario';
                tituloMision = `📋 Encuestas: ${textoInstruccion}`;
            }
        }
        
        if (despertar) {
            // Red de seguridad
            if (!responsable && centro.padre) {
                const padreUser = await this.usuariosRepository.findOne({ where: { username: centro.padre } });
                if (padreUser) responsable = { id: padreUser.id };
            }

            // Actualizamos Tarea
            tarea.status = 'Pendiente';
            tarea.fechaAsignacion = new Date();
            if (responsable) tarea.colaboradorAsignado = responsable;
            
            tarea.historial.push({
                fecha: new Date(),
                autor: 'SISTEMA',
                accion: 'ACTIVACION',
                nota: `Activado: ${tituloMision}`
            });

            await this.pendientesRepository.save(tarea);

            // CORRECCIÓN VISUAL: Guardamos o Creamos el Caso
            if (tarea.casos && tarea.casos.length > 0) {
                const caso = tarea.casos[0];
                caso.descripcion = tituloMision;
                await this.casosRepository.save(caso);
            } else {
                const nuevoCaso = this.casosRepository.create({
                    descripcion: tituloMision,
                    tipo_servicio: finalConfig.tipo_servicio,
                    pendiente: tarea,
                    imagenes: []
                });
                await this.casosRepository.save(nuevoCaso);
            }

            activadas++;
        }
    }

    if (activadas === 0) {
        return this.pendientesService.create({
            nombreCentro: centroNombre,
            asesorId: usuarioId,
            area: 'Produccion',
            casos: [{ 
                tipo_servicio: finalConfig.tipo_servicio, 
                descripcion: `⚠️ Emergencia: ${finalConfig.descripcion}`, 
                imagenes: [] 
            }]
        });
    }

    return { mensaje: `Se activaron ${activadas} tareas.` };
  }
}