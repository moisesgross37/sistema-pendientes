import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCliente } from './entities/marketing-cliente.entity';
import { CreateMarketingDto } from './dto/create-marketing.dto';
// 👇 1. Faltaba importar esto:
import { CentroEducativo } from './entities/centro-educativo.entity';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(MarketingCliente)
    private marketingRepository: Repository<MarketingCliente>,
    @InjectRepository(CentroEducativo)
    private centrosRepository: Repository<CentroEducativo>,
  ) {}

  // 1. Crear un nuevo cliente de Marketing
  async create(createDto: CreateMarketingDto) {
    const nuevo = this.marketingRepository.create({
      ...createDto,
      eventos_data: {} // Inicializamos el JSON vacío
    });
    return this.marketingRepository.save(nuevo);
  }

  // 2. Obtener todos los clientes activos (Los más nuevos primero)
  findAll() {
    return this.marketingRepository.find({
      where: { activo: true },
      order: { fecha_creacion: 'DESC' },
    });
  }

  // 3. Obtener uno por ID
  async findOne(id: number) {
    const cliente = await this.marketingRepository.findOneBy({ id });
    if (!cliente) throw new NotFoundException(`Cliente #${id} no encontrado`);
    return cliente;
  }

  // 3.5 Actualizar Info Básica
  async update(id: number, updateDto: any) {
    const cliente = await this.findOne(id);
    // Actualizamos los campos básicos que nos envíen
    this.marketingRepository.merge(cliente, updateDto);
    return this.marketingRepository.save(cliente);
  }

  // 4. ACTUALIZAR UN EVENTO (El Cerebro del Candado y Semáforo) 🧠
  async updateEvento(id: number, eventoKey: string, datos: any) {
    const cliente = await this.findOne(id);

    // Aseguramos que el objeto del evento exista en el JSON
    if (!cliente.eventos_data[eventoKey]) {
        cliente.eventos_data[eventoKey] = {
            fecha_realizacion: null,
            web_subida: null,
            redes_trabajadas: null,
            encuesta_directivo: null,
            encuesta_estudiante: null
        };
    }

    // Actualizamos solo los campos que nos enviaron (Merge)
    cliente.eventos_data[eventoKey] = {
        ...cliente.eventos_data[eventoKey],
        ...datos
    };

    // Truco para forzar a TypeORM a detectar cambios en un JSONB
    const copia = { ...cliente.eventos_data };
    cliente.eventos_data = copia;

    return this.marketingRepository.save(cliente);
  } 
  // 👆 AQUÍ TERMINA updateEvento. ¡Importante cerrar la llave antes de seguir!

  // ---------------------------------------------------------
  // 👇 AQUÍ EMPIEZAN LAS NUEVAS FUNCIONES (Fuera de las anteriores)
  // ---------------------------------------------------------

  // 5. FUNCIÓN PARA COSECHAR NOMBRES DE COLEGIOS EXISTENTES
  async sincronizarCentros() {
    // 1. Obtener todos los clientes actuales
    const clientes = await this.marketingRepository.find();
    let contados = 0;

    // 2. Recorrer cada cliente
    for (const cliente of clientes) {
      const nombreLimpio = cliente.nombre_centro.trim();

      // 3. Verificar si ya existe en la lista maestra
      const existe = await this.centrosRepository.findOne({ where: { nombre: nombreLimpio } });

      // 4. Si no existe, lo creamos
      if (!existe && nombreLimpio.length > 0) {
        const nuevoCentro = this.centrosRepository.create({ nombre: nombreLimpio });
        await this.centrosRepository.save(nuevoCentro);
        contados++;
      }
    }

    return { mensaje: 'Sincronización completada', nuevos_centros_guardados: contados };
  }

  // 6. FUNCIÓN PARA OBTENER LA LISTA (PARA EL BUSCADOR)
  async findAllCentros() {
    return this.centrosRepository.find({ order: { nombre: 'ASC' } });
  }

} // <--- FINAL DE LA CLASE