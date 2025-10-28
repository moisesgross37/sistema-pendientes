import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Importa el ValidationPipe si no está ya
import { ValidationPipe } from '@nestjs/common'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ================================================================
  // ===== 🚀 AÑADE ESTA LÍNEA PARA ARREGLAR EL ERROR DE CORS 🚀 =====
  // ================================================================
  app.enableCors();
  // ================================================================

  // Es buena práctica tener esto también (probablemente ya lo tenías)
  app.useGlobalPipes(new ValidationPipe());

  // Usamos process.env.PORT para que Render asigne el puerto
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
