import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('centros_educativos') // Este será el nombre de la tabla en la base de datos
export class CentroEducativo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true }) // Importante: No permitirá nombres repetidos exactos
  nombre: string;

  @CreateDateColumn()
  fecha_creacion: Date;

  @Column({ default: true })
  visible: boolean;

}
