import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express'; // <-- Importación nueva
import { join } from 'path'; // <-- Importación nueva

async function bootstrap() {
  // Le decimos a Nest que usaremos express de forma explícita
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // --- LÍNEA CLAVE ---
  // Hacemos que la carpeta 'uploads' sea públicamente accesible
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/pendientes/uploads/',
  });

  app.enableCors();
  const port = process.env.PORT || 3007;
  await app.listen(port);
  console.log(`🚀 Aplicación corriendo en el puerto: ${port}`);
}
bootstrap();
