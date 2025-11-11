import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
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

  // --- 👇 AQUÍ ESTÁ LA CORRECCIÓN ---
  @Column({ nullable: true }) // <-- Le decimos que PUEDE ser nula
  descripcion: string;
  // --- 👆 ---

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