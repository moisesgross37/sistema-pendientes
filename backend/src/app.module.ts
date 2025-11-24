import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static'; // <--- 1. IMPORTANTE: LA LLAVE MAESTRA
import { join } from 'path'; // <--- 2. NECESARIO PARA RUTAS
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PendientesModule } from './pendientes/pendientes.module';
import { AuthModule } from './auth/auth.module';
import { CasosModule } from './casos/casos.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : 'localhost',
      port: process.env.DATABASE_URL ? undefined : 5432,
      username: process.env.DATABASE_URL ? undefined : 'moisesgross',
      password: process.env.DATABASE_URL ? undefined : 'tu_contraseña',
      database: process.env.DATABASE_URL ? undefined : 'pendientes_db',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      synchronize: true,
    }),

    // 👇👇👇 AQUÍ ESTÁ LA SOLUCIÓN DEL ERROR 404 👇👇👇
    // Esto le dice al servidor: "Deja que cualquiera vea los archivos en la carpeta uploads"
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'), // Busca la carpeta uploads en la raíz del proyecto
      serveRoot: '/uploads', // Define la URL pública (ej: tudominio.com/uploads/foto.jpg)
    }),
    // 👆👆👆 FIN DE LA SOLUCIÓN 👆👆👆

    UsuariosModule,
    PendientesModule,
    AuthModule,
    CasosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}