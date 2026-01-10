import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Pendiente } from '../../pendientes/entities/pendiente.entity';
import { Caso } from '../../casos/entities/caso.entity'; 

@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  // 👇 CORRECCIÓN: Lo dejamos como 'password' para no romper tu login
  @Column()
  password: string;

  @Column({ default: 'Colaborador' }) 
  rol: string; 

  @Column({ default: true })
  isActive: boolean;

  // 👇 ESTO ES LO NUEVO QUE QUEREMOS (INSIGNIAS)
  @Column('simple-array', { nullable: true })
  departamentos: string[];

  // ----------------------------------------------------
  // RELACIONES
  // ----------------------------------------------------

  @OneToMany(() => Pendiente, (pendiente) => pendiente.colaboradorAsignado)
  asignaciones: Pendiente[];

  @OneToMany(() => Pendiente, (pendiente) => pendiente.asesor)
  asesorias: Pendiente[];

  @OneToMany(() => Caso, (caso) => caso.responsable)
  casosAsignados: Caso[];

  @Column({ nullable: true })
  nombreCompleto: string;
}