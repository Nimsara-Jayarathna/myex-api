import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupAdminSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Blipzo Internal Admin API')
    .setDescription('Internal unversioned admin APIs under /internal/admin/*')
    .setVersion('internal')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/admin', app, document);
}
