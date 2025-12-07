import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MarketingCliente } from './entities/marketing-cliente.entity'; // Asegúrate de haber creado la entidad en el paso anterior
import { CreateMarketingDto } from './dto/create-marketing.dto';

@Injectable()
export class MarketingService {
  constructor(
    @InjectRepository(MarketingCliente)
    private marketingRepository: Repository<MarketingCliente>,
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
  // 👇 AGREGAR ESTO EN EL SERVICIO
  async update(id: number, updateDto: any) {
    const cliente = await this.findOne(id);
    // Actualizamos los campos básicos que nos envíen
    this.marketingRepository.merge(cliente, updateDto);
    return this.marketingRepository.save(cliente);
  }

  // 4. ACTUALIZAR UN EVENTO (El Cerebro del Candado y Semáforo) 🧠
  // Recibe: id del cliente, nombre del evento (ej: 'combos') y los datos a actualizar
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
    // Esto permite actualizar solo la fecha_realizacion sin borrar los links, o viceversa
    cliente.eventos_data[eventoKey] = {
        ...cliente.eventos_data[eventoKey],
        ...datos
    };

    // Truco para forzar a TypeORM a detectar cambios en un JSONB
    const copia = { ...cliente.eventos_data };
    cliente.eventos_data = copia;

    return this.marketingRepository.save(cliente);
  }
}