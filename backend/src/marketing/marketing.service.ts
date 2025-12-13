import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCliente } from './entities/marketing-cliente.entity';
import { CreateMarketingDto } from './dto/create-marketing.dto';
import { CentroEducativo } from './entities/centro-educativo.entity';
// 👇 IMPORTAR PENDIENTE
import { Pendiente } from '../pendientes/entities/pendiente.entity';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(MarketingCliente)
    private marketingRepository: Repository<MarketingCliente>,
    
    @InjectRepository(CentroEducativo)
    private centrosRepository: Repository<CentroEducativo>,

    // 👇 INYECTAR EL REPOSITORIO DE PENDIENTES (LA FUENTE DE DATOS)
    @InjectRepository(Pendiente)
    private pendientesRepository: Repository<Pendiente>,
  ) {}

  // ... (Tus funciones create, findAll, findOne, update, updateEvento SE QUEDAN IGUAL) ...
  // (Por espacio no las repito todas, pero asegúrate de dejarlas ahí)
  
  // COPIAR DESDE AQUÍ HACIA ABAJO PARA REEMPLAZAR LA PARTE NUEVA:

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

  // =========================================================
  // 👇 AQUÍ ESTÁ LA MAGIA NUEVA: COSECHAR DE PENDIENTES
  // =========================================================

  async sincronizarCentros() {
    // 1. Obtener TODOS los pendientes históricos (Solo el nombre para no cargar memoria)
    // Usamos 'select' para que sea rápido y no traiga imágenes ni relaciones pesadas
    const pendientes = await this.pendientesRepository.find({
        select: ['nombreCentro']
    });

    let contados = 0;
    let omitidos = 0;

    // 2. Recorrer cada pendiente histórico
    for (const p of pendientes) {
      if (!p.nombreCentro) continue;

      const nombreLimpio = p.nombreCentro.trim(); // Quitar espacios extra

      if (nombreLimpio.length < 3) continue; // Ignorar nombres muy cortos o vacíos

      // 3. Verificar si ya existe en la lista maestra
      const existe = await this.centrosRepository.findOne({ where: { nombre: nombreLimpio } });

      // 4. Si no existe, lo guardamos en la Agenda Maestra
      if (!existe) {
        const nuevoCentro = this.centrosRepository.create({ nombre: nombreLimpio });
        await this.centrosRepository.save(nuevoCentro);
        contados++;
      } else {
        omitidos++;
      }
    }

    return { 
        mensaje: 'Cosecha completada con éxito', 
        total_pendientes_analizados: pendientes.length,
        nuevos_centros_aprendidos: contados,
        ya_existian: omitidos
    };
  }

  // --- 6. OBTENER LISTA LIMPIA (Solo para el Buscador del Usuario) ---
  async findAllCentros() {
    return this.centrosRepository.find({ 
      where: { visible: true }, // 👈 EL FILTRO DE SEGURIDAD
      order: { nombre: 'ASC' } 
    });
  }

  // --- 7. OBTENER TODO (Para tu Panel de Limpieza) ---
  async findAllCentrosAdmin() {
    return this.centrosRepository.find({ order: { nombre: 'ASC' } });
  }

  // --- 8. EL INTERRUPTOR (Apagar/Prender) ---
  async toggleVisibilidadCentro(id: number) {
    const centro = await this.centrosRepository.findOneBy({ id });
    if (!centro) throw new NotFoundException('Centro no encontrado');
    
    centro.visible = !centro.visible; // Invertir valor (True -> False)
    return this.centrosRepository.save(centro);
  }
}