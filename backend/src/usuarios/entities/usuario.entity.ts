import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'usuarios' }) // Le decimos que la tabla en la BD se llamará "usuarios"
export class Usuario {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  nombreCompleto: string;

  @Column({ unique: true }) // ¡Importante! No puede haber dos usuarios con el mismo username
  username: string;

  @Column()
  password: string; // Más adelante la vamos a encriptar, no te preocupes

  @Column({ default: 'Asesor' }) // Si no especificamos un rol, por defecto será 'Asesor'
  rol: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
