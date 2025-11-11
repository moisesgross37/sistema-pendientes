// backend/src/casos/entities/caso.entity.ts

import { Pendiente } from '../../pendientes/entities/pendiente.entity';
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

  @ManyToOne(() => EstadoCaso, (estado) => estado.casos, {
    eager: true,
    nullable: true,
  })
  estado: EstadoCaso;

  @Column({ type: 'simple-array', nullable: true })
  imagenes: string[];

  @CreateDateColumn()
  fechaCreacion: Date;

  @Column({ type: 'text', nullable: true })
  comentario: string | null;

  // --- 👇 AQUÍ ESTÁ LA CORRECCIÓN ---
  // Muchos Casos pertenecen a Un Pendiente
  @ManyToOne(() => Pendiente, (pendiente) => pendiente.casos, {
    onDelete: 'CASCADE', // <-- ¡AÑADIMOS ESTO!
  })
  // --- 👆 ---
  pendiente: Pendiente;
}