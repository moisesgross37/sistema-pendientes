import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('centros_educativos')
export class CentroEducativo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  nombre: string;

  // 👇 NUEVO CAMPO: Define si es 'cliente' (Colegio) o 'interno' (Depto)
  @Column({ default: 'cliente' })
  tipo: string; 

  @Column({ nullable: true })
  asesor: string;

  @Column({ nullable: true })
  padre: string; 

  @Column({ nullable: true })
  tio: string;   

  @CreateDateColumn()
  fecha_creacion: Date;

  @Column({ default: true })
  visible: boolean;
}