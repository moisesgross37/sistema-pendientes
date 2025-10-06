import { Usuario } from '../../usuarios/entities/usuario.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'pendientes' })
export class Pendiente {
  
  @Column({ type: 'simple-array', nullable: true }) // <-- LÍNEA NUEVA
  imagenes?: string[]; 
  
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  fechaCreacion: Date;

  @Column()
  nombreCentro: string;

  @Column()
  descripcion: string;

  @Column({
  type: 'enum',
  enum: ['Por Asignar', 'Iniciado', 'Fuera de oficina', 'Concluido', 'En administración'],
  default: 'Por Asignar',
})
status: string;

  @Column({ default: false })
  archivado: boolean;

  // Relaciones con la tabla de Usuarios
  @ManyToOne(() => Usuario, { eager: true }) // eager: true carga el usuario automáticamente
  asesor: Usuario;

  @ManyToOne(() => Usuario, { nullable: true, eager: true }) // nullable: true permite que esté vacío
  colaboradorAsignado: Usuario;

  // Podríamos añadir un campo para imágenes más adelante
  // @Column({ type: 'simple-array', nullable: true })
  // imagenes: string[];
}