import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PendientesModule } from './pendientes/pendientes.module';
import { AuthModule } from './auth/auth.module';
import { CasosModule } from './casos/casos.module'; // <--- 1. AÑADIR ESTA IMPORTACIÓN

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // --- Tu lógica inteligente (se mantiene igual) ---
      type: 'postgres',
      // Si estamos en producción (Render), usa la URL de la variable de entorno
      url: process.env.DATABASE_URL,
      // Si estamos en local, usa la configuración de siempre
      host: process.env.DATABASE_URL ? undefined : 'localhost',
      port: process.env.DATABASE_URL ? undefined : 5432,
      username: process.env.DATABASE_URL ? undefined : 'moisesgross',
      password: process.env.DATABASE_URL ? undefined : 'tu_contraseña', // Cambia tu contraseña local si es necesario
      database: process.env.DATABASE_URL ? undefined : 'pendientes_db',

      // Opciones adicionales para Render
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,

      autoLoadEntities: true,
      synchronize: true, // Mantenlo en true para la fase inicial en Render
    }),
    UsuariosModule,
    PendientesModule,
    AuthModule,
    CasosModule, // <--- 2. AÑADIR EL MÓDULO AQUÍ
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}