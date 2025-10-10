import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Hacemos que la carpeta del disco de Render sea públicamente accesible
  app.useStaticAssets('/opt/render/project/src/uploads', {
    prefix: '/pendientes/uploads/',
  });
  
  app.enableCors();
  const port = process.env.PORT || 3007;
  await app.listen(port);
  console.log(`🚀 Aplicación corriendo en el puerto: ${port}`);
}
bootstrap();
