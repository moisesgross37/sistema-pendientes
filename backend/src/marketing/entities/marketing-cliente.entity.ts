import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// 1. Definimos la forma de los datos internos (JSON)
export interface EstadoEvento {
  fecha_realizacion: string | null; // El Candado
  
  // Las evidencias (Fecha y hora de cuando se hizo clic)
  web_subida: string | null;        
  redes_trabajadas: string | null;  
  encuesta_directivo: string | null; 
  encuesta_estudiante: string | null;
}

// 2. Definimos los 5 eventos que maneja el sistema
export interface EventosData {
  combos?: EstadoEvento;
  lanzamiento?: EstadoEvento;
  exterior?: EstadoEvento;
  pre_graduacion?: EstadoEvento;
  graduacion?: EstadoEvento;
}

// 3. La Tabla de la Base de Datos
@Entity('marketing_clientes')
export class MarketingCliente {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombre_centro: string;

  @Column({ nullable: true })
  directivo_nombre: string;

  @Column({ nullable: true })
  directivo_tel: string;

  @Column({ nullable: true })
  estudiante_nombre: string;

  @Column({ nullable: true })
  estudiante_tel: string;

  // Aquí se guardará todo el JSON con fechas y semáforos
  @Column('jsonb', { default: {} })
  eventos_data: EventosData;

  @Column({ default: true })
  activo: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fecha_creacion: Date;
}