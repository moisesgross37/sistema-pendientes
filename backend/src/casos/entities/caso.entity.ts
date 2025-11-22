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

  // --- ⭐ NUEVA COLUMNA AGREGADA (SOLUCIÓN DEL ERROR) ⭐ ---
  // Aquí se guardará el link de la evidencia que subas (PDF/Imagen)
  @Column({ nullable: true })
  archivoUrl: string;
  // --------------------------------------------------------

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

  @ManyToOne(() => Pendiente, (pendiente) => pendiente.casos, {
    onDelete: 'CASCADE', 
  })
  pendiente: Pendiente;
}