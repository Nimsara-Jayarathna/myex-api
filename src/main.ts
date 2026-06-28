import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MongooseExceptionFilter } from './common/filters/mongoose-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { setupPublicSwagger } from './docs/swagger/public-swagger';
import { setupAdminSwagger } from './docs/swagger/admin-swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const origins = (config.get<string>('CLIENT_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });
  app.use(cookieParser());
  app.use(mongoSanitize());
  app.use(hpp());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new MongooseExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  setupPublicSwagger(app);
  setupAdminSwagger(app);

  const port = config.get<number>('PORT') ?? 5000;
  await app.listen(port);
}

void bootstrap();
