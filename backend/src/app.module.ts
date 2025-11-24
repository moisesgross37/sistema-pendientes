import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { PendientesModule } from './pendientes/pendientes.module';
import { AuthModule } from './auth/auth.module';
import { CasosModule } from './casos/casos.module';
import { EstadosCasosModule } from './estados-casos/estados-casos.module'; // Asegúrate de importar esto si lo usas

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      // Configuración local (fallback)
      host: process.env.DATABASE_URL ? undefined : 'localhost',
      port: process.env.DATABASE_URL ? undefined : 5432,
      username: process.env.DATABASE_URL ? undefined : 'moisesgross',
      password: process.env.DATABASE_URL ? undefined : 'tu_contraseña', // Cambia esto si es necesario
      database: process.env.DATABASE_URL ? undefined : 'pendientes_db',

      // --- 🛡️ MEJORA DE CONEXIÓN PARA RENDER ---
      ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
      
      // Mantiene la conexión viva para evitar "cold starts" de la BD
      keepConnectionAlive: true, 
      
      // Auto-carga de entidades (evita tener que importarlas una por una aquí)
      autoLoadEntities: true,
      
      // OJO: En producción real, synchronize debería ser false, 
      // pero para esta etapa de desarrollo en Render está bien en true.
      synchronize: true, 
    }),
    UsuariosModule,
    PendientesModule,
    AuthModule,
    CasosModule,
    EstadosCasosModule, // Agregado por seguridad si lo tienes creado
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}