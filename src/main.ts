import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { MongooseExceptionFilter } from './common/filters/mongoose-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { noSqlSanitizationMiddleware } from './common/middleware/no-sql-sanitization.middleware';
import { setupPublicSwagger } from './docs/swagger/public-swagger';
import { setupAdminSwagger } from './docs/swagger/admin-swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.set('trust proxy', 1);
  const config = app.get(ConfigService);

  const origins = (config.get<string>('CLIENT_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.use(helmet());
  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });
  app.use(cookieParser());
  app.use(noSqlSanitizationMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new MongooseExceptionFilter(), new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor(), new ResponseInterceptor(app.get(Reflector)));

  setupPublicSwagger(app);
  setupAdminSwagger(app);

  const port = config.get<number>('PORT') ?? 5000;
  await app.listen(port);
}

void bootstrap();
