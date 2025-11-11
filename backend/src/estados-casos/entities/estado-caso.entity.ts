// backend/src/estados-casos/entities/estado-caso.entity.ts

// (Asegúrate de que la importación circular que viste en el log
// HAYA SIDO ELIMINADA. Este archivo SÍ debe importar 'Caso')

import { Caso } from '../../casos/entities/caso.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';

@Entity({ name: 'estados_casos' })
export class EstadoCaso {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true }) // El nombre (ej: "Detenido") debe ser único
  nombre: string;

  @Column({ default: '#888888' }) // Un color por defecto (gris)
  color: string;

  // Esta es la columna para tu idea de "Detenido"
  @Column({ default: false })
  requiereComentario: boolean;

  // --- La Relación ---
  // Un EstadoCaso puede estar en muchos Casos
  @OneToMany(() => Caso, (caso) => caso.estado)
  casos: Caso[];
}