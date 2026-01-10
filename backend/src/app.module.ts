import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PendientesModule } from './pendientes/pendientes.module';
import { AuthModule } from './auth/auth.module';
import { CasosModule } from './casos/casos.module';
import { MarketingModule } from './marketing/marketing.module';
import { ServiciosModule } from './servicios/servicios.module';
import { ActivacionesModule } from './activaciones/activaciones.module'; 

// 👇 1. IMPORTACIÓN OBLIGATORIA (Asegúrate que esta línea exista arriba)
import { Usuario } from './usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      host: process.env.DATABASE_URL ? undefined : 'localhost',
      port: process.env.DATABASE_URL ? undefined : 5432,
      username: process.env.DATABASE_URL ? undefined : 'moisesgross',
      password: process.env.DATABASE_URL ? undefined : 'tu_contraseña', // Revisa que esto sea correcto en local
      database: process.env.DATABASE_URL ? undefined : 'pendientes_db',
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      autoLoadEntities: true,
      
      // 💣 LIMPIEZA TOTAL ACTIVADA
      dropSchema: true, 
      synchronize: true,
    }),

    // 👇 2. PERMISO OBLIGATORIO (Sin esto, AppService falla al crear el Admin)
    TypeOrmModule.forFeature([Usuario]), 

    // 📸 FOTOS HÍBRIDAS
    ServeStaticModule.forRoot({
      rootPath: process.env.RENDER_DISK_PATH || join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    UsuariosModule,
    PendientesModule,
    AuthModule,
    CasosModule,
    MarketingModule,
    ServiciosModule,
    ActivacionesModule, 
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}