import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupPublicSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Blipzo Public API')
    .setDescription('Versioned public APIs: /api/v1 and /api/v1.1')
    .setVersion('1.1')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs/public', app, document);
}
