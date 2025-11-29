import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm'; // (Nota: quité UpdateDateColumn si no se usaba, o puedes dejarlo)
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
  area: string; // Ej: 'General', 'Impresion', 'Admin'

  @Column({ nullable: true })
  descripcion: string;

  @Column({
    type: 'enum',
    enum: [
      'Por Asignar',
      'Iniciado',
      'Fuera de oficina',
      'Concluido',
      'En administración',
    ],
    default: 'Por Asignar',
  })
  status: string;

  @Column({ default: false })
  archivado: boolean;

  @Column({ type: 'simple-array', nullable: true })
  imagenes?: string[];

  // --- 👇 AQUÍ ESTÁ LA NUEVA BITÁCORA (HISTORIAL) ---
  // Usamos 'jsonb' para guardar la lista de movimientos dentro del mismo pendiente
  // sin tener que crear una tabla extra. Es perfecto para auditoría.
  @Column('jsonb', { nullable: true, default: [] })
  historial: { 
    fecha: Date; 
    autor: string; 
    accion: string; 
    nota: string; 
  }[];
  // --- 👆 ------------------------------------------

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