import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('servicios_catalogo')
export class Servicio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  @Column({ default: true })
  activo: boolean;
}