import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PendientesModule } from './pendientes/pendientes.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432, // Puerto por defecto de PostgreSQL
      username: 'moisesgross', // Usuario por defecto, cámbialo si el tuyo es diferente
      password: '2278', // ¡IMPORTANTE! Pon aquí la contraseña de tu PostgreSQL
      database: 'pendientes_db', // El nombre que le daremos a nuestra base de datos
      autoLoadEntities: true, // Carga automáticamente las entidades que definamos
      synchronize: true, // ¡Solo para desarrollo! Crea las tablas automáticamente
    }),
    UsuariosModule,
    PendientesModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}