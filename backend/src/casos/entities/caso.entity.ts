// backend/src/casos/entities/caso.entity.ts

import { Pendiente } from '../../pendientes/entities/pendiente.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity'; // 👈 1. IMPORTAR USUARIO
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { EstadoCaso } from '../../estados-casos/entities/estado-caso.entity';

@Entity({ name: 'casos' })
export class Caso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  descripcion: string;

  @Column({ nullable: true })
  tipo_servicio: string;

  // Link de la evidencia (PDF/Imagen) subida por el colaborador
  @Column({ nullable: true })
  archivoUrl: string;

  @ManyToOne(() => EstadoCaso, (estado) => estado.casos, {
    eager: true,
    nullable: true,
  })
  estado: EstadoCaso;

  @Column({ type: 'simple-array', nullable: true })
  imagenes: string[];

  @CreateDateColumn()
  fechaCreacion: Date;

  // --- ⏱️ NUEVAS COLUMNAS DE MÉTRICAS (RELOJ AUTOMÁTICO) ⏱️ ---
  
  @Column({ type: 'timestamp', nullable: true })
  fecha_inicio: Date; // Se llenará sola cuando pases a "En Proceso"

  @Column({ type: 'timestamp', nullable: true })
  fecha_fin: Date;    // Se llenará sola cuando pases a "Completado"

  // ------------------------------------------------------------

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  @ManyToOne(() => Pendiente, (pendiente) => pendiente.casos, {
    onDelete: 'CASCADE', 
  })
  pendiente: Pendiente;

  // --- 👤 NUEVA COLUMNA DE RESPONSABLE INDIVIDUAL (MICRO-GESTIÓN) 👤 ---
  
  @ManyToOne(() => Usuario, { nullable: true })
  responsable: Usuario; // Aquí guardamos si el caso lo tiene Jesús o Juan
  
  // --------------------------------------------------------------------
}