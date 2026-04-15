import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = [
    process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
    'http://localhost:3002',
    'http://localhost:3003',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  console.log(`MamaCare API en écoute sur le port ${port} ✓`);
}

bootstrap();
