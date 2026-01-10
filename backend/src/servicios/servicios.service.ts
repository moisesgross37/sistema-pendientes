import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Servicio } from './servicio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import * as bcrypt from 'bcrypt'; // 👈 1. IMPORTAMOS BCRYPT

@Injectable()
export class ServiciosService {
  constructor(
    @InjectRepository(Servicio)
    private serviciosRepo: Repository<Servicio>,
    
    @InjectRepository(Usuario)
    private usuariosRepo: Repository<Usuario>,
  ) {}

  async findAll() {
    return this.serviciosRepo.find({ order: { nombre: 'ASC' } });
  }

  // =================================================================
  // 🌱 LA SUPER SEMILLA (AHORA CON CLAVE ENCRIPTADA)
  // =================================================================
  async semillaInicial() {
    let log: string[] = [];

    // --- PASO 1: RESTAURAR SERVICIOS ---
    const listaServicios = [
      'Kit fotos pre graduacion', 'Kit fotos en Exterior', 'Kit fotos extras',
      'Mural', 'Bajante', 'Diseño Gráfico',
      'Reconocimientos varios', 'Pin Promocionales', 
      'Toallas Promocional', 'Llaveros Promocional',
    ];

    let serviciosCreados = 0;
    for (const nombre of listaServicios) {
      const existe = await this.serviciosRepo.findOneBy({ nombre });
      if (!existe) {
        await this.serviciosRepo.save(this.serviciosRepo.create({ nombre }));
        serviciosCreados++;
      }
    }
    log.push(`✅ Servicios sembrados: ${serviciosCreados} nuevos.`);

    // --- PASO 2: RESTAURAR TRIPULACIÓN ---
    const tripulacion = [
        { username: 'Moises', rol: 'Administrador' },
        { username: 'Benjamin', rol: 'Colaborador' },
        { username: 'Wander', rol: 'Colaborador' },
        { username: 'Jesus', rol: 'Colaborador' },
        { username: 'Perez', rol: 'Colaborador' },
        { username: 'Leudis', rol: 'Asesor' }
    ];

    // 👇 GENERAMOS EL HASH DE '123' UNA VEZ PARA TODOS
    const salt = await bcrypt.genSalt();
    const passwordEncriptada = await bcrypt.hash('123', salt);

    let usuariosCreados = 0;
    for (const tripulante of tripulacion) {
        const existe = await this.usuariosRepo.findOneBy({ username: tripulante.username });
        
        if (!existe) {
            const nuevoUsuario = this.usuariosRepo.create({
                username: tripulante.username,
                password: passwordEncriptada, // 👈 USAMOS LA ENCRIPTADA AQUÍ
                rol: tripulante.rol
            });
            await this.usuariosRepo.save(nuevoUsuario);
            usuariosCreados++;
        }
    }
    log.push(`✅ Usuarios rescatados: ${usuariosCreados} (Clave: 123).`);

    return { 
        mensaje: '🌱 Semilla ejecutada correctamente.', 
        detalles: log 
    };
  }
}