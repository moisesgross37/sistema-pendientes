import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm'; 
import { Caso } from '../../casos/entities/caso.entity';

@Entity({ name: 'pendientes' })
export class Pendiente {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fechaCreacion: Date;

  @Column({ type: 'timestamp', nullable: true })
  fechaAsignacion: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  fechaConclusion: Date | null;

  @Column()
  nombreCentro: string;

  @Column({ nullable: true })
  area: string; // Ej: 'General', 'Impresion', 'Admin', 'Marketing', 'Logistica'

  @Column({ nullable: true })
  descripcion: string;

  @Column({
    type: 'text', // 👈 CAMBIO: Ahora es texto libre, acepta todo
    default: 'Por Asignar',
  })
  status: string;

  @Column({ default: false })
  archivado: boolean;

  @Column({ type: 'simple-array', nullable: true })
  imagenes?: string[];

  // --- BITÁCORA (HISTORIAL) ---
  // Usamos 'jsonb' para guardar la lista de movimientos
  @Column('jsonb', { nullable: true, default: [] })
  historial: { 
    fecha: Date; 
    autor: string; 
    accion: string; 
    nota: string; 
  }[];

  // =================================================================
  // 📍 FASE 1.2: SIEMBRA AUTOMÁTICA (CAMPOS DEL MAPA ORIENTE)
  // =================================================================

  @Column({ default: false }) 
  esHito: boolean;

  @Column({ nullable: true }) 
  eventoKey: string; // Ej: '1' (Combos), '5' (Graduación)

  @Column({ nullable: true }) 
  tipoHito: string; // Ej: 'RECOLECCION', 'ENCUESTA'

  // =================================================================

  // --- RELACIONES ---

  @ManyToOne(() => Usuario, { eager: true })
  asesor: Usuario;

  @ManyToOne(() => Usuario, { nullable: true, eager: true })
  colaboradorAsignado: Usuario | null;

  @OneToMany(() => Caso, (caso) => caso.pendiente, {
    eager: true,
    cascade: true,
  })
  casos: Caso[];
}