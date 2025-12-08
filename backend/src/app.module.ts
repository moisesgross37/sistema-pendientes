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
import { MarketingModule } from './marketing/marketing.module'; // ✅ Importado correctamente

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
      // ❌ AQUÍ NO VA MarketingModule (Lo quité de aquí)
    }),

    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),

    UsuariosModule,
    PendientesModule,
    AuthModule,
    CasosModule,
    MarketingModule, // ✅ AQUÍ SÍ VA (En la lista principal de imports)
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
// prueba