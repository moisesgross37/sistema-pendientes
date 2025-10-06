import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  // Render nos dará el puerto a través de una variable de entorno
  const port = process.env.PORT || 3007; 
  await app.listen(port);
  console.log(`🚀 Aplicación corriendo en el puerto: ${port}`);
}
bootstrap();